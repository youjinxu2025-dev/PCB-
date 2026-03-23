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
  paymentEntryLink: document.querySelector("#paymentEntryLink"),
  authLink: document.querySelector("#authLink"),
  userBadge: document.querySelector("#userBadge")
};

const priceMap = { schematic: 499, pcb: 699, combo: 1199 };
const layerMap = { 2: 0, 4: 200, 6: 450, 8: 800 };
const complexityMap = {
  basic: { price: 0, label: "适合基础控制板、常规接口板或简单MCU小系统" },
  mid: { price: 300, label: "适合多接口、多电源或中等复杂度项目" },
  high: { price: 800, label: "适合高速、电源、混合信号或复杂约束项目" }
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
  const rushText = els.speed.value === "rush" ? " / 含加急费用" : "";

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
    const files = event.dataTransfer.files;
    els.fileInput.files = files;
    renderFiles(files);
  });
}

function bindReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach((item) => observer.observe(item));
}

function setMessage(text, type = "info") {
  els.orderMessage.textContent = text;
  els.orderMessage.dataset.state = type;
}

function isServerMode() {
  return window.location.protocol.startsWith("http");
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

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("pcbCurrentUser") || "null");
  } catch {
    return null;
  }
}

function hydrateAuth() {
  const user = getCurrentUser();
  if (!user) return;
  els.userBadge.textContent = `已登录：${user.name}`;
  els.authLink.textContent = "账号中心";
}

async function submitOrder() {
  if (!isServerMode()) {
    setMessage("请先通过线上地址访问网站，再使用上传和支付功能。", "error");
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    setMessage("请先注册或登录账号，再提交订单。", "error");
    return;
  }

  if (!els.projectName.value.trim() || !els.contact.value.trim()) {
    setMessage("请先填写项目名称和联系方式。", "error");
    return;
  }

  const files = [...els.fileInput.files];
  if (!files.length) {
    setMessage("请至少上传一个设计文件。", "error");
    return;
  }

  els.submitOrderBtn.disabled = true;
  setMessage("正在上传文件并创建订单，请稍候...", "loading");

  try {
    const payload = {
      accountId: user.id,
      accountName: user.name,
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

    const href = `payment.html?orderId=${encodeURIComponent(data.order.id)}`;
    localStorage.setItem("latestOrderId", data.order.id);
    els.payNowLink.href = href;
    els.paymentEntryLink.href = href;
    setMessage(`订单创建成功，订单号：${data.order.id}。现在可以进入支付页面。`, "success");
  } catch (error) {
    setMessage(`提交失败：${error.message}`, "error");
  } finally {
    els.submitOrderBtn.disabled = false;
  }
}

function hydratePaymentLinks() {
  const latestOrderId = localStorage.getItem("latestOrderId");
  if (!latestOrderId) return;
  const href = `payment.html?orderId=${encodeURIComponent(latestOrderId)}`;
  els.payNowLink.href = href;
  els.paymentEntryLink.href = href;
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

updateSummary();
updatePrice();
bindDragAndDrop();
bindReveal();
hydratePaymentLinks();
hydrateAuth();
