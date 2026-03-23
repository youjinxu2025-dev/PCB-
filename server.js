const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const STORAGE_ROOT = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : ROOT;
const DATA_DIR = path.join(STORAGE_ROOT, "data");
const UPLOAD_DIR = path.join(STORAGE_ROOT, "uploads");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const MAX_BODY_SIZE = 80 * 1024 * 1024;
const SMS_CODE_TTL = 5 * 60 * 1000;
const smsCodeStore = new Map();

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  for (const file of [ORDERS_FILE, PAYMENTS_FILE, USERS_FILE]) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf8");
    }
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon"
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "文件不存在" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_SIZE) {
        reject(new Error("请求体过大，请减少上传文件数量或体积"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJsonBody(raw) {
  if (!raw) return {};
  return JSON.parse(raw);
}

function sanitizeFileName(name) {
  return String(name || "unnamed.bin").replace(/[\\/:*?"<>|]/g, "_");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isValidChinaPhone(phone) {
  return /^1\d{10}$/.test(normalizePhone(phone));
}

function createOrderId(existingOrders) {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const serial = String(existingOrders.length + 1).padStart(3, "0");
  return `PCB-${datePart}-${serial}`;
}

function createUserId(existingUsers) {
  return `USR-${String(existingUsers.length + 1).padStart(3, "0")}`;
}

function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password, user) {
  if (user.passwordHash && user.passwordSalt) {
    const actual = Buffer.from(hashPassword(password, user.passwordSalt), "hex");
    const expected = Buffer.from(user.passwordHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  return user.password === password;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || ""
  };
}

function createSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setSmsCode(phone) {
  const normalizedPhone = normalizePhone(phone);
  const code = createSmsCode();
  smsCodeStore.set(normalizedPhone, {
    code,
    expiresAt: Date.now() + SMS_CODE_TTL
  });
  return code;
}

function clearSmsCode(phone) {
  smsCodeStore.delete(normalizePhone(phone));
}

function verifySmsCode(phone, code) {
  const normalizedPhone = normalizePhone(phone);
  const session = smsCodeStore.get(normalizedPhone);

  if (!session) {
    return { ok: false, error: "请先获取短信验证码" };
  }

  if (Date.now() > session.expiresAt) {
    clearSmsCode(normalizedPhone);
    return { ok: false, error: "验证码已过期，请重新获取" };
  }

  if (String(code || "").trim() !== session.code) {
    return { ok: false, error: "短信验证码不正确" };
  }

  clearSmsCode(normalizedPhone);
  return { ok: true };
}

function findUserByPhone(users, phone) {
  const normalizedPhone = normalizePhone(phone);
  return users.find((user) => normalizePhone(user.phone) === normalizedPhone);
}

async function handleSendSmsCode(req, res) {
  try {
    const payload = parseJsonBody(await getRequestBody(req));
    const phone = normalizePhone(payload.phone);

    if (!isValidChinaPhone(phone)) {
      sendJson(res, 400, { error: "请输入有效的 11 位手机号" });
      return;
    }

    const users = readJson(USERS_FILE);
    if (payload.purpose === "register" && findUserByPhone(users, phone)) {
      sendJson(res, 409, { error: "该手机号已注册，请直接登录" });
      return;
    }

    const code = setSmsCode(phone);
    sendJson(res, 200, {
      ok: true,
      message: "验证码已发送",
      phone,
      demoCode: code,
      expiresInSeconds: 300
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "验证码发送失败" });
  }
}

async function handleRegister(req, res) {
  try {
    const payload = parseJsonBody(await getRequestBody(req));
    const name = String(payload.name || "").trim();
    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || "");
    const code = String(payload.code || "").trim();

    if (!name || !isValidChinaPhone(phone) || !code || !password) {
      sendJson(res, 400, { error: "请填写姓名、手机号、短信验证码和登录密码" });
      return;
    }

    if (password.length < 6) {
      sendJson(res, 400, { error: "密码至少需要 6 位" });
      return;
    }

    const users = readJson(USERS_FILE);
    if (findUserByPhone(users, phone)) {
      sendJson(res, 409, { error: "该手机号已注册，请直接登录" });
      return;
    }

    const verification = verifySmsCode(phone, code);
    if (!verification.ok) {
      sendJson(res, 400, { error: verification.error });
      return;
    }

    const passwordSalt = createSalt();
    const user = {
      id: createUserId(users),
      name,
      email: "",
      phone,
      passwordSalt,
      passwordHash: hashPassword(password, passwordSalt),
      createdAt: new Date().toISOString()
    };

    users.unshift(user);
    writeJson(USERS_FILE, users);
    sendJson(res, 201, { ok: true, user: publicUser(user) });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "注册失败" });
  }
}

async function handleLogin(req, res) {
  try {
    const payload = parseJsonBody(await getRequestBody(req));
    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || "");
    const users = readJson(USERS_FILE);
    const user = findUserByPhone(users, phone);

    if (!user || !verifyPassword(password, user)) {
      sendJson(res, 401, { error: "手机号或密码不正确" });
      return;
    }

    sendJson(res, 200, { ok: true, user: publicUser(user) });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "登录失败" });
  }
}

async function handleCreateOrder(req, res) {
  try {
    const payload = parseJsonBody(await getRequestBody(req));

    if (!payload.accountId || !payload.projectName || !payload.contact || !Array.isArray(payload.files) || payload.files.length === 0) {
      sendJson(res, 400, { error: "缺少账号、项目名称、联系方式或上传文件" });
      return;
    }

    const users = readJson(USERS_FILE);
    const account = users.find((user) => user.id === payload.accountId);
    if (!account) {
      sendJson(res, 401, { error: "请先登录有效账号后再提交订单" });
      return;
    }

    const orders = readJson(ORDERS_FILE);
    const orderId = createOrderId(orders);
    const orderUploadDir = path.join(UPLOAD_DIR, orderId);
    fs.mkdirSync(orderUploadDir, { recursive: true });

    const savedFiles = payload.files.map((file) => {
      const safeName = sanitizeFileName(file.name);
      const filePath = path.join(orderUploadDir, safeName);
      fs.writeFileSync(filePath, Buffer.from(file.contentBase64 || "", "base64"));

      return {
        name: safeName,
        type: file.type || "application/octet-stream",
        size: Number(file.size || 0),
        savedPath: path.relative(STORAGE_ROOT, filePath).replace(/\\/g, "/")
      };
    });

    const order = {
      id: orderId,
      accountId: account.id,
      accountName: account.name,
      accountPhone: account.phone || "",
      projectName: String(payload.projectName).trim(),
      contact: String(payload.contact).trim(),
      focus: String(payload.focus || "").trim(),
      delivery: String(payload.delivery || "").trim(),
      notes: String(payload.notes || "").trim(),
      pricing: payload.pricing || {},
      paymentStatus: "待付款",
      reviewStatus: "待审核",
      createdAt: new Date().toISOString(),
      files: savedFiles
    };

    orders.unshift(order);
    writeJson(ORDERS_FILE, orders);
    sendJson(res, 201, { ok: true, order });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "创建订单失败" });
  }
}

async function handleCreatePayment(req, res) {
  try {
    const payload = parseJsonBody(await getRequestBody(req));

    if (!payload.orderId || !payload.payerName || !payload.amount) {
      sendJson(res, 400, { error: "缺少订单号、付款人或金额" });
      return;
    }

    const orders = readJson(ORDERS_FILE);
    const order = orders.find((item) => item.id === payload.orderId);
    if (!order) {
      sendJson(res, 404, { error: "未找到对应订单" });
      return;
    }

    const payments = readJson(PAYMENTS_FILE);
    const payment = {
      id: `PAY-${Date.now()}`,
      orderId: payload.orderId,
      payerName: String(payload.payerName).trim(),
      method: String(payload.method || "未填写").trim(),
      amount: Number(payload.amount),
      note: String(payload.note || "").trim(),
      createdAt: new Date().toISOString()
    };

    payments.unshift(payment);
    order.paymentStatus = "已付定金";

    writeJson(PAYMENTS_FILE, payments);
    writeJson(ORDERS_FILE, orders);
    sendJson(res, 201, { ok: true, payment });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "提交付款失败" });
  }
}

function handleDashboard(res) {
  const orders = readJson(ORDERS_FILE);
  const payments = readJson(PAYMENTS_FILE);

  const stats = {
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.paymentStatus !== "待付款").length,
    pendingOrders: orders.filter((order) => order.reviewStatus === "待审核").length,
    totalRevenue: payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };

  sendJson(res, 200, { stats, orders, payments });
}

function handleHealth(res) {
  sendJson(res, 200, {
    ok: true,
    service: "pcb-review-studio",
    time: new Date().toISOString(),
    storageRoot: STORAGE_ROOT
  });
}

function handleRoute(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  if (req.method === "GET" && pathname === "/api/health") {
    handleHealth(res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/sms-code") {
    handleSendSmsCode(req, res);
    return;
  }

  if (req.method === "POST" && (pathname === "/api/register" || pathname === "/api/register-phone")) {
    handleRegister(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    handleLogin(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/orders") {
    handleCreateOrder(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/payments") {
    handleCreatePayment(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/api/dashboard") {
    handleDashboard(res);
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(ROOT, relativePath));

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "禁止访问" });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendJson(res, 404, { error: "页面不存在" });
      return;
    }

    sendFile(res, filePath);
  });
}

ensureStorage();

http.createServer(handleRoute).listen(PORT, HOST, () => {
  console.log(`PCB审图工坊已启动: http://${HOST}:${PORT}`);
});
