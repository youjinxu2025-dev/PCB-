const myEls = {
  userBadge: document.querySelector("#myUserBadge"),
  status: document.querySelector("#myStatus"),
  totalOrders: document.querySelector("#myTotalOrders"),
  paidOrders: document.querySelector("#myPaidOrders"),
  pendingOrders: document.querySelector("#myPendingOrders"),
  totalSpent: document.querySelector("#myTotalSpent"),
  ordersList: document.querySelector("#myOrdersList"),
  paymentsList: document.querySelector("#myPaymentsList")
};

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("pcbCurrentUser") || "null");
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function riskLabel(value) {
  return { high: "高风险", medium: "中风险", low: "低风险" }[value] || "中风险";
}

function riskText(value) {
  return { high: "需要优先修改", medium: "建议修改后再打样", low: "可作为优化项" }[value] || "建议修改后再打样";
}

function countIssues(issues, severity) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function setStatus(text, type = "info") {
  myEls.status.textContent = text;
  myEls.status.dataset.state = type;
}

function renderReviewReport(order) {
  const report = order.reviewReport;
  if (!report?.issues?.length) {
    return `
      <div class="review-empty">
        <strong>评审反馈待更新</strong>
        <span>工程师完成审核后，这里会显示问题点、风险等级和修改建议。</span>
      </div>
    `;
  }

  const issues = report.issues;
  return `
    <section class="client-review">
      <div class="client-review-head">
        <div>
          <span class="status-pill risk-${report.overallRisk}">整体：${riskLabel(report.overallRisk)}</span>
          <h3>可视化评审反馈</h3>
          <p>${report.summary || "本次评审已标出主要问题点，请按风险等级优先处理。"}</p>
        </div>
        <span>${report.reviewer || "审图工坊"} · ${formatDate(report.updatedAt)}</span>
      </div>

      <div class="risk-meter">
        <span class="risk-high">高风险 ${countIssues(issues, "high")}</span>
        <span class="risk-medium">中风险 ${countIssues(issues, "medium")}</span>
        <span class="risk-low">低风险 ${countIssues(issues, "low")}</span>
      </div>

      <div class="review-map" aria-label="PCB 问题点示意图">
        <div class="review-map-grid"></div>
        ${issues.map((issue, index) => `
          <span
            class="review-dot risk-${issue.severity}"
            style="left:${issue.x || 50}%; top:${issue.y || 50}%"
            title="${issue.title || `问题点 ${index + 1}`}"
          >${index + 1}</span>
        `).join("")}
      </div>

      <div class="client-issue-list">
        ${issues.map((issue, index) => `
          <article class="client-issue-card risk-${issue.severity}">
            <div class="client-issue-title">
              <strong>${index + 1}. ${issue.title || "未命名问题"}</strong>
              <span>${riskLabel(issue.severity)} / ${riskText(issue.severity)}</span>
            </div>
            <p><b>位置：</b>${issue.location || "未标注"} ${issue.area ? ` / ${issue.area}` : ""}</p>
            <p><b>问题：</b>${issue.description || "暂无问题说明。"}</p>
            <p><b>建议：</b>${issue.suggestion || "暂无修改建议。"}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderOrders(orders) {
  if (!orders.length) {
    myEls.ordersList.innerHTML = '<p class="empty-state">暂时还没有订单记录。</p>';
    return;
  }

  myEls.ordersList.innerHTML = orders.map((order) => `
    <article class="my-order-card">
      <div class="my-order-head">
        <div>
          <strong>${order.projectName}</strong>
          <span>${order.id} · ${formatDate(order.createdAt)}</span>
        </div>
        <span class="my-order-price">￥${order.pricing?.estimate || 0}</span>
      </div>
      <div class="my-order-meta">
        <span>审核重点：${order.focus || "未填写"}</span>
        <span>交付时效：${order.delivery || "未填写"}</span>
        <span>联系方式：${order.contact || "未填写"}</span>
      </div>
      <div class="my-order-tags">
        <span class="status-pill">付款：${order.paymentStatus}</span>
        <span class="status-pill">审核：${order.reviewStatus}</span>
        <span class="status-pill">文件：${order.files?.length || 0} 个</span>
      </div>
      <div class="mini-note">${order.notes || "本单没有填写额外备注。"}</div>
      ${renderReviewReport(order)}
      <div class="action-row">
        <a class="button button-secondary" href="payment.html?orderId=${encodeURIComponent(order.id)}">继续支付</a>
      </div>
    </article>
  `).join("");
}

function renderPayments(payments) {
  if (!payments.length) {
    myEls.paymentsList.innerHTML = '<p class="empty-state">暂时还没有付款记录。</p>';
    return;
  }

  myEls.paymentsList.innerHTML = payments.map((payment) => `
    <div class="file-item">
      <div>
        <strong>${payment.orderId}</strong>
        <span>${payment.payerName} / ${payment.method} / ${formatDate(payment.createdAt)}</span>
      </div>
      <span>￥${payment.amount}</span>
    </div>
  `).join("");
}

async function loadMyOrders() {
  if (!window.location.protocol.startsWith("http")) {
    setStatus("请先通过线上地址访问网站，再查看个人中心。", "error");
    return;
  }

  const user = getCurrentUser();
  if (!user?.id) {
    myEls.userBadge.textContent = "未登录";
    setStatus("你还没有登录账号，请先去登录注册页完成登录。", "error");
    myEls.ordersList.innerHTML = '<p class="empty-state">登录后这里会显示你的订单。</p>';
    myEls.paymentsList.innerHTML = '<p class="empty-state">登录后这里会显示你的付款记录。</p>';
    return;
  }

  myEls.userBadge.textContent = `${user.name} / ${user.phone || "已登录"}`;
  setStatus("正在同步你的订单和付款数据...", "loading");

  try {
    const response = await fetch(`/api/my-orders?accountId=${encodeURIComponent(user.id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "读取订单失败");
    }

    myEls.totalOrders.textContent = data.stats.totalOrders;
    myEls.paidOrders.textContent = data.stats.paidOrders;
    myEls.pendingOrders.textContent = data.stats.pendingReview;
    myEls.totalSpent.textContent = `￥${data.stats.totalSpent}`;

    renderOrders(data.orders);
    renderPayments(data.payments);
    setStatus("个人中心已更新，你可以直接查看订单状态和付款记录。", "success");
  } catch (error) {
    setStatus(`读取失败：${error.message}`, "error");
  }
}

loadMyOrders();
