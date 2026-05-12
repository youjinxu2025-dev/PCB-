const els = {
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector(".dropzone"),
  fileList: document.querySelector("#fileList"),
  projectName: document.querySelector("#projectName"),
  contact: document.querySelector("#contact"),
  focus: document.querySelector("#focus"),
  delivery: document.querySelector("#delivery"),
  notes: document.querySelector("#notes"),
  summaryProject: document.querySelector("#summaryProject"),
  summaryFocus: document.querySelector("#summaryFocus"),
  summaryDelivery: document.querySelector("#summaryDelivery"),
  summaryFiles: document.querySelector("#summaryFiles"),
  summaryPrice: document.querySelector("#summaryPrice"),
  serviceType: document.querySelector("#serviceType"),
  layerCount: document.querySelector("#layerCount"),
  complexity: document.querySelector("#complexity"),
  speed: document.querySelector("#speed"),
  priceValue: document.querySelector("#priceValue"),
  priceHint: document.querySelector("#priceHint"),
  submitOrderBtn: document.querySelector("#submitOrderBtn"),
  orderMessage: document.querySelector("#orderMessage"),
  payNowLink: document.querySelector("#payNowLink"),
  authLink: document.querySelector("#authLink"),
  userBadge: document.querySelector("#userBadge"),
  homeLoginPhone: document.querySelector("#homeLoginPhone"),
  homeLoginPassword: document.querySelector("#homeLoginPassword"),
  homeLoginBtn: document.querySelector("#homeLoginBtn"),
  homeLogoutBtn: document.querySelector("#homeLogoutBtn"),
  homeLoginMessage: document.querySelector("#homeLoginMessage"),
  headerLogoutBtn: document.querySelector("#headerLogoutBtn"),
  uploadHeading: document.querySelector("#uploadHeading"),
  uploadPanel: document.querySelector("#uploadPanel")
};

const priceMap = { schematic: 499, pcb: 699, combo: 1199 };
const layerMap = { 2: 0, 4: 200, 6: 450, 8: 800 };
const complexityMap = {
  basic: { price: 0, label: "基础功能板，适合常规控制和接口项目" },
  mid: { price: 300, label: "中等复杂度，适合多接口和多电源项目" },
  high: { price: 800, label: "高复杂度，适合高速、电源和混合信号项目" }
};
const speedMap = { standard: 0, rush: 500 };

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getCurrentPrice() {
  return (
    priceMap[els.serviceType.value] +
    layerMap[els.layerCount.value] +
    complexityMap[els.complexity.value].price +
    speedMap[els.speed.value]
  );
}

function renderFiles(files) {
  const list = [...files];

  if (!list.length) {
    els.fileList.innerHTML = '<p class="empty-state">还没有选择文件</p>';
    els.summaryFiles.textContent = "0 个";
    return;
  }

  els.fileList.innerHTML = list.map((file) => `
    <div class="file-item">
      <div>
        <strong>${file.name}</strong>
        <span>${formatSize(file.size)}</span>
      </div>
      <span>${file.type || "工程文件"}</span>
    </div>
  `).join("");

  els.summaryFiles.textContent = `${list.length} 个`;
}

function updateSummary() {
  els.summaryProject.textContent = els.projectName.value.trim() || "待填写";
  els.summaryFocus.textContent = els.focus.value;
  els.summaryDelivery.textContent = els.delivery.value;
  els.summaryPrice.textContent = `￥${getCurrentPrice()}`;
}

function updatePrice() {
  const total = getCurrentPrice();
  const complexity = complexityMap[els.complexity.value];
  const rushText = els.speed.value === "rush" ? " / 含加急费" : "";

  els.priceValue.textContent = `￥${total}`;
  els.priceHint.textContent = `${els.layerCount.value} 层 / ${complexity.label}${rushText}`;
  updateSummary();
}

function bindDragAndDrop() {
  ["dragenter", "dragover"].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragover");
    });
  });

  els.dropzone.addEventListener("drop", (event) => {
    els.fileInput.files = event.dataTransfer.files;
    renderFiles(event.dataTransfer.files);
  });
}

function setMessage(text, type = "info") {
  els.orderMessage.textContent = text;
  els.orderMessage.dataset.state = type;
}

function setHomeLoginMessage(text, type = "info") {
  if (!els.homeLoginMessage) return;
  els.homeLoginMessage.textContent = text;
  els.homeLoginMessage.dataset.state = type;
}

function isServerMode() {
  return window.location.protocol.startsWith("http");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("pcbCurrentUser") || "null");
  } catch {
    return null;
  }
}

function renderOrderAccess() {
  const user = getCurrentUser();
  if (els.uploadHeading) {
    els.uploadHeading.classList.toggle("is-hidden", !user);
  }
  if (els.uploadPanel) {
    els.uploadPanel.classList.toggle("is-hidden", !user);
  }
}

function hydrateAuth() {
  const user = getCurrentUser();
  renderOrderAccess();
  if (!user) {
    els.userBadge.textContent = "未登录";
    els.authLink.textContent = "账号中心";
    els.authLink.href = "auth.html";
    els.homeLoginBtn.textContent = "立即登录";
    els.homeLoginBtn.classList.remove("is-hidden");
    els.homeLogoutBtn?.classList.add("is-hidden");
    els.headerLogoutBtn?.classList.add("is-hidden");
    return;
  }
  els.userBadge.textContent = `已登录：${user.name}`;
  els.authLink.textContent = "我的订单";
  els.authLink.href = "my.html";
  setHomeLoginMessage(`当前已登录：${user.name} / ${user.phone || "已绑定账号"}`, "success");
  if (els.homeLoginBtn) {
    els.homeLoginBtn.classList.add("is-hidden");
  }
  els.homeLogoutBtn?.classList.remove("is-hidden");
  els.headerLogoutBtn?.classList.remove("is-hidden");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function saveCurrentUser(user) {
  localStorage.setItem("pcbCurrentUser", JSON.stringify(user));
}

function logoutFromHome() {
  localStorage.removeItem("pcbCurrentUser");
  if (els.homeLoginPhone) els.homeLoginPhone.value = "";
  if (els.homeLoginPassword) els.homeLoginPassword.value = "";
  setHomeLoginMessage("已退出登录，可以切换其他手机号继续使用。", "info");
  hydrateAuth();
  renderOrderAccess();
}

async function homeLogin() {
  if (!isServerMode()) {
    setHomeLoginMessage("请通过线上网址访问网站后再登录。", "error");
    return;
  }

  const phone = normalizePhone(els.homeLoginPhone.value);
  const password = els.homeLoginPassword.value.trim();

  if (!/^1\d{10}$/.test(phone) || !password) {
    setHomeLoginMessage("请输入 11 位手机号和登录密码。", "error");
    return;
  }

  els.homeLoginBtn.disabled = true;
  setHomeLoginMessage("正在登录账号...", "loading");

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
    els.homeLoginPassword.value = "";
    hydrateAuth();
    renderOrderAccess();
    setHomeLoginMessage(`登录成功：${data.user.name}。现在可以直接上传文件下单。`, "success");
  } catch (error) {
    setHomeLoginMessage(`登录失败：${error.message}`, "error");
  } finally {
    els.homeLoginBtn.disabled = false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function buildFilePayload(files) {
  const result = [];
  for (const file of files) {
    result.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      contentBase64: await fileToBase64(file)
    });
  }
  return result;
}

async function submitOrder() {
  if (!isServerMode()) {
    setMessage("请先通过线上地址访问网站，再使用上传和下单功能。", "error");
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    setMessage("请先登录账号，再提交订单。", "error");
    return;
  }

  if (!els.projectName.value.trim() || !els.contact.value.trim()) {
    setMessage("请先填写项目名称和联系方式。", "error");
    return;
  }

  const files = [...els.fileInput.files];
  if (!files.length) {
    setMessage("请至少上传一个文件。", "error");
    return;
  }

  els.submitOrderBtn.disabled = true;
  setMessage("正在上传文件并创建订单...", "loading");

  try {
    const payload = {
      accountId: user.id,
      projectName: els.projectName.value.trim(),
      contact: els.contact.value.trim(),
      focus: els.focus.value,
      delivery: els.delivery.value,
      notes: els.notes.value.trim(),
      pricing: {
        serviceType: els.serviceType.value,
        layerCount: Number(els.layerCount.value),
        complexity: els.complexity.value,
        speed: els.speed.value,
        estimate: getCurrentPrice()
      },
      files: await buildFilePayload(files)
    };

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "提交失败");
    }

    const payHref = `payment.html?orderId=${encodeURIComponent(data.order.id)}`;
    localStorage.setItem("latestOrderId", data.order.id);
    els.payNowLink.href = payHref;
    setMessage(`订单已创建，订单号：${data.order.id}。现在可以继续付款。`, "success");
  } catch (error) {
    setMessage(`提交失败：${error.message}`, "error");
  } finally {
    els.submitOrderBtn.disabled = false;
  }
}

function hydratePaymentLinks() {
  const latestOrderId = localStorage.getItem("latestOrderId");
  if (!latestOrderId) return;
  els.payNowLink.href = `payment.html?orderId=${encodeURIComponent(latestOrderId)}`;
}

els.fileInput.addEventListener("change", (event) => renderFiles(event.target.files));
els.projectName.addEventListener("input", updateSummary);
els.focus.addEventListener("change", updateSummary);
els.delivery.addEventListener("change", updateSummary);
els.serviceType.addEventListener("change", updatePrice);
els.layerCount.addEventListener("change", updatePrice);
els.complexity.addEventListener("change", updatePrice);
els.speed.addEventListener("change", updatePrice);
els.submitOrderBtn.addEventListener("click", submitOrder);
els.homeLoginBtn.addEventListener("click", homeLogin);
els.homeLogoutBtn.addEventListener("click", logoutFromHome);
els.headerLogoutBtn.addEventListener("click", logoutFromHome);

updateSummary();
updatePrice();
bindDragAndDrop();
hydratePaymentLinks();
hydrateAuth();
