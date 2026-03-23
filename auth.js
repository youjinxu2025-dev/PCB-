const authEls = {
  registerName: document.querySelector("#registerName"),
  registerPhone: document.querySelector("#registerPhone"),
  registerCode: document.querySelector("#registerCode"),
  registerPassword: document.querySelector("#registerPassword"),
  registerPasswordConfirm: document.querySelector("#registerPasswordConfirm"),
  loginPhone: document.querySelector("#loginPhone"),
  loginPassword: document.querySelector("#loginPassword"),
  sendCodeBtn: document.querySelector("#sendCodeBtn"),
  registerBtn: document.querySelector("#registerBtn"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  authMessage: document.querySelector("#authMessage")
};

let smsCountdown = 0;
let countdownTimer = null;

function setAuthMessage(text, type = "info") {
  authEls.authMessage.textContent = text;
  authEls.authMessage.dataset.state = type;
}

function saveCurrentUser(user) {
  localStorage.setItem("pcbCurrentUser", JSON.stringify(user));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isServerMode() {
  return window.location.protocol.startsWith("http");
}

function updateSendCodeButton() {
  if (smsCountdown > 0) {
    authEls.sendCodeBtn.disabled = true;
    authEls.sendCodeBtn.textContent = `${smsCountdown}s 后重发`;
    return;
  }

  authEls.sendCodeBtn.disabled = false;
  authEls.sendCodeBtn.textContent = "获取验证码";
}

function startCountdown(seconds = 60) {
  smsCountdown = seconds;
  updateSendCodeButton();

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  countdownTimer = window.setInterval(() => {
    smsCountdown -= 1;
    if (smsCountdown <= 0) {
      smsCountdown = 0;
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    updateSendCodeButton();
  }, 1000);
}

async function sendCode() {
  if (!isServerMode()) {
    setAuthMessage("请先通过线上地址访问网站，再使用验证码注册功能。", "error");
    return;
  }

  const name = authEls.registerName.value.trim();
  const phone = normalizePhone(authEls.registerPhone.value);

  if (!name) {
    setAuthMessage("请先填写姓名或称呼。", "error");
    return;
  }

  if (!/^1\d{10}$/.test(phone)) {
    setAuthMessage("请输入有效的 11 位手机号。", "error");
    return;
  }

  authEls.sendCodeBtn.disabled = true;
  setAuthMessage("正在生成短信验证码...", "loading");

  try {
    const response = await fetch("/api/sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "register" })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "验证码发送失败");
    }

    startCountdown(60);
    const demoSuffix = data.demoCode
      ? ` 当前演示环境验证码：${data.demoCode}。`
      : "";
    setAuthMessage(`验证码已发送到手机号 ${phone}。${demoSuffix}`, "success");
  } catch (error) {
    smsCountdown = 0;
    updateSendCodeButton();
    setAuthMessage(`验证码发送失败：${error.message}`, "error");
  }
}

async function register() {
  if (!isServerMode()) {
    setAuthMessage("请先通过线上地址访问网站，再使用注册登录功能。", "error");
    return;
  }

  const name = authEls.registerName.value.trim();
  const phone = normalizePhone(authEls.registerPhone.value);
  const code = authEls.registerCode.value.trim();
  const password = authEls.registerPassword.value.trim();
  const passwordConfirm = authEls.registerPasswordConfirm.value.trim();

  if (!name || !/^1\d{10}$/.test(phone) || !code || !password || !passwordConfirm) {
    setAuthMessage("请完整填写姓名、手机号、验证码和两次密码。", "error");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("登录密码至少需要 6 位。", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setAuthMessage("两次输入的密码不一致，请重新确认。", "error");
    return;
  }

  try {
    const response = await fetch("/api/register-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, code, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "注册失败");
    }

    saveCurrentUser(data.user);
    setAuthMessage(`注册成功，当前已登录账号：${data.user.name} / ${data.user.phone}`, "success");
  } catch (error) {
    setAuthMessage(`注册失败：${error.message}`, "error");
  }
}

async function login() {
  if (!isServerMode()) {
    setAuthMessage("请先通过线上地址访问网站，再使用注册登录功能。", "error");
    return;
  }

  const phone = normalizePhone(authEls.loginPhone.value);
  const password = authEls.loginPassword.value.trim();

  if (!/^1\d{10}$/.test(phone) || !password) {
    setAuthMessage("请输入注册手机号和登录密码。", "error");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "登录失败");
    }

    saveCurrentUser(data.user);
    setAuthMessage(`登录成功，欢迎回来：${data.user.name}`, "success");
  } catch (error) {
    setAuthMessage(`登录失败：${error.message}`, "error");
  }
}

function logout() {
  localStorage.removeItem("pcbCurrentUser");
  setAuthMessage("已退出登录。", "info");
}

authEls.sendCodeBtn.addEventListener("click", sendCode);
authEls.registerBtn.addEventListener("click", register);
authEls.loginBtn.addEventListener("click", login);
authEls.logoutBtn.addEventListener("click", logout);
updateSendCodeButton();
