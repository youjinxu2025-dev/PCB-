const adminEls = {
  statOrders: document.querySelector("#statOrders"),
  statPaid: document.querySelector("#statPaid"),
  statPending: document.querySelector("#statPending"),
  statRevenue: document.querySelector("#statRevenue"),
  ordersBody: document.querySelector("#ordersBody"),
  paymentsList: document.querySelector("#paymentsList"),
  refreshBtn: document.querySelector("#refreshBtn")
};

function formatDate(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function renderOrders(orders) {
  if (!orders.length) {
    adminEls.ordersBody.innerHTML = '<tr><td colspan="7">暂无订单数据</td></tr>';
    return;
  }

  adminEls.ordersBody.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.accountName || "-"}</td>
      <td>${order.projectName}</td>
      <td>${order.contact}</td>
      <td>￥${order.pricing.estimate || 0}</td>
      <td>${order.paymentStatus}</td>
      <td>${order.files.length}</td>
    </tr>
  `).join("");
}

function renderPayments(payments) {
  if (!payments.length) {
    adminEls.paymentsList.innerHTML = '<p class="empty-state">暂无付款记录</p>';
    return;
  }

  adminEls.paymentsList.innerHTML = payments.map((payment) => `
    <div class="file-item">
      <div>
        <strong>${payment.orderId}</strong>
        <span>${payment.payerName} / ${payment.method} / ${formatDate(payment.createdAt)}</span>
      </div>
      <span>￥${payment.amount}</span>
    </div>
  `).join("");
}

async function loadDashboard() {
  if (!window.location.protocol.startsWith("http")) {
    adminEls.ordersBody.innerHTML = '<tr><td colspan="7">请先通过线上地址访问网站，再查看后台数据</td></tr>';
    return;
  }

  const response = await fetch("/api/dashboard");
  const data = await response.json();

  adminEls.statOrders.textContent = data.stats.totalOrders;
  adminEls.statPaid.textContent = data.stats.paidOrders;
  adminEls.statPending.textContent = data.stats.pendingOrders;
  adminEls.statRevenue.textContent = `￥${data.stats.totalRevenue}`;

  renderOrders(data.orders);
  renderPayments(data.payments);
}

adminEls.refreshBtn.addEventListener("click", loadDashboard);
loadDashboard();
