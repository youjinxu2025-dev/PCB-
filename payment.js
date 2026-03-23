const payEls = {
  orderId: document.querySelector("#orderId"),
  payerName: document.querySelector("#payerName"),
  payMethod: document.querySelector("#payMethod"),
  payAmount: document.querySelector("#payAmount"),
  payNote: document.querySelector("#payNote"),
  paySubmitBtn: document.querySelector("#paySubmitBtn"),
  payMessage: document.querySelector("#payMessage")
};

function setPayMessage(text, type = "info") {
  payEls.payMessage.textContent = text;
  payEls.payMessage.dataset.state = type;
}

function hydrateOrderId() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || localStorage.getItem("latestOrderId") || "";
  payEls.orderId.value = orderId;
}

async function submitPayment() {
  if (!window.location.protocol.startsWith("http")) {
    setPayMessage("请先通过线上地址访问网站，再使用支付登记功能。", "error");
    return;
  }

  if (!payEls.orderId.value.trim() || !payEls.payerName.value.trim() || !payEls.payAmount.value) {
    setPayMessage("请填写订单号、付款人姓名和支付金额。", "error");
    return;
  }

  payEls.paySubmitBtn.disabled = true;
  setPayMessage("正在提交付款记录...", "loading");

  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: payEls.orderId.value.trim(),
        payerName: payEls.payerName.value.trim(),
        method: payEls.payMethod.value,
        amount: Number(payEls.payAmount.value),
        note: payEls.payNote.value.trim()
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "付款登记失败");
    }

    setPayMessage(`付款记录已提交，订单 ${data.payment.orderId} 状态已更新为“已付定金”。`, "success");
  } catch (error) {
    setPayMessage(`提交失败：${error.message}`, "error");
  } finally {
    payEls.paySubmitBtn.disabled = false;
  }
}

payEls.paySubmitBtn.addEventListener("click", submitPayment);
hydrateOrderId();
