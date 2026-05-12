const adminEls = {
  statOrders: document.querySelector("#statOrders"),
  statPaid: document.querySelector("#statPaid"),
  statPending: document.querySelector("#statPending"),
  statRevenue: document.querySelector("#statRevenue"),
  ordersBody: document.querySelector("#ordersBody"),
  paymentsList: document.querySelector("#paymentsList"),
  refreshBtn: document.querySelector("#refreshBtn"),
  selectedOrderText: document.querySelector("#selectedOrderText"),
  reviewOrderId: document.querySelector("#reviewOrderId"),
  reviewStatus: document.querySelector("#reviewStatus"),
  overallRisk: document.querySelector("#overallRisk"),
  reviewer: document.querySelector("#reviewer"),
  reviewSummary: document.querySelector("#reviewSummary"),
  issueEditorList: document.querySelector("#issueEditorList"),
  addIssueBtn: document.querySelector("#addIssueBtn"),
  saveReviewBtn: document.querySelector("#saveReviewBtn"),
  reviewMessage: document.querySelector("#reviewMessage")
};

let dashboardOrders = [];

function formatDate(value) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

function setReviewMessage(text, type = "info") {
  adminEls.reviewMessage.textContent = text;
  adminEls.reviewMessage.dataset.state = type;
}

function emptyIssue() {
  return {
    title: "",
    severity: "medium",
    area: "",
    location: "",
    description: "",
    suggestion: "",
    x: 50,
    y: 50
  };
}

function severityLabel(value) {
  return { high: "高风险", medium: "中风险", low: "低风险" }[value] || "中风险";
}

function renderIssueEditors(issues = [emptyIssue()]) {
  const list = issues.length ? issues : [emptyIssue()];
  adminEls.issueEditorList.innerHTML = list.map((issue, index) => `
    <article class="issue-editor" data-index="${index}">
      <div class="panel-head">
        <h3>问题点 ${index + 1}</h3>
        <button class="button button-secondary remove-issue-btn" type="button" data-index="${index}">删除</button>
      </div>
      <div class="form-grid">
        <label>
          <span>问题标题</span>
          <input data-field="title" value="${issue.title || ""}" placeholder="例如：USB D+ / D- 走线不等长">
        </label>
        <label>
          <span>风险等级</span>
          <select data-field="severity">
            <option value="high" ${issue.severity === "high" ? "selected" : ""}>高风险</option>
            <option value="medium" ${issue.severity === "medium" ? "selected" : ""}>中风险</option>
            <option value="low" ${issue.severity === "low" ? "selected" : ""}>低风险</option>
          </select>
        </label>
        <label>
          <span>模块区域</span>
          <input data-field="area" value="${issue.area || ""}" placeholder="例如：电源输入 / MCU / USB">
        </label>
        <label>
          <span>图纸位置</span>
          <input data-field="location" value="${issue.location || ""}" placeholder="例如：原理图 P3 / PCB 左上角">
        </label>
        <label>
          <span>可视化 X 位置%</span>
          <input data-field="x" type="number" min="0" max="100" value="${issue.x ?? 50}">
        </label>
        <label>
          <span>可视化 Y 位置%</span>
          <input data-field="y" type="number" min="0" max="100" value="${issue.y ?? 50}">
        </label>
      </div>
      <label>
        <span>问题说明</span>
        <textarea data-field="description" rows="3" placeholder="写清为什么有风险、可能导致什么问题">${issue.description || ""}</textarea>
      </label>
      <label>
        <span>修改建议</span>
        <textarea data-field="suggestion" rows="3" placeholder="写清客户应该怎么改">${issue.suggestion || ""}</textarea>
      </label>
    </article>
  `).join("");

  document.querySelectorAll(".remove-issue-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const issuesNow = readIssueEditors();
      issuesNow.splice(Number(button.dataset.index), 1);
      renderIssueEditors(issuesNow.length ? issuesNow : [emptyIssue()]);
    });
  });
}

function readIssueEditors() {
  return [...document.querySelectorAll(".issue-editor")].map((card) => {
    const issue = {};
    card.querySelectorAll("[data-field]").forEach((field) => {
      issue[field.dataset.field] = field.value;
    });
    issue.x = Number(issue.x || 50);
    issue.y = Number(issue.y || 50);
    return issue;
  });
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
      <td>￥${order.pricing?.estimate || 0}</td>
      <td>${order.paymentStatus}</td>
      <td>${order.reviewStatus}</td>
      <td><button class="button button-secondary choose-order-btn" type="button" data-order-id="${order.id}">填写评审</button></td>
    </tr>
  `).join("");

  document.querySelectorAll(".choose-order-btn").forEach((button) => {
    button.addEventListener("click", () => selectOrder(button.dataset.orderId));
  });
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

function selectOrder(orderId) {
  const order = dashboardOrders.find((item) => item.id === orderId);
  if (!order) return;

  const report = order.reviewReport || {};
  adminEls.selectedOrderText.textContent = `${order.projectName} / ${order.accountName || "客户"}`;
  adminEls.reviewOrderId.value = order.id;
  adminEls.reviewStatus.value = order.reviewStatus || "审核中";
  adminEls.overallRisk.value = report.overallRisk || "medium";
  adminEls.reviewer.value = report.reviewer || "审图工坊";
  adminEls.reviewSummary.value = report.summary || "";
  renderIssueEditors(report.issues?.length ? report.issues : [emptyIssue()]);
  setReviewMessage(`已选择订单 ${order.id}，可以开始填写评审反馈。`, "success");
}

async function saveReview() {
  const orderId = adminEls.reviewOrderId.value.trim();
  if (!orderId) {
    setReviewMessage("请先从订单列表选择一个订单。", "error");
    return;
  }

  const payload = {
    reviewStatus: adminEls.reviewStatus.value,
    overallRisk: adminEls.overallRisk.value,
    reviewer: adminEls.reviewer.value.trim(),
    summary: adminEls.reviewSummary.value.trim(),
    issues: readIssueEditors()
  };

  adminEls.saveReviewBtn.disabled = true;
  setReviewMessage("正在保存评审反馈...", "loading");

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "保存失败");
    }

    setReviewMessage(`已保存并反馈给客户。问题点：${data.order.reviewReport.issues.length} 个。`, "success");
    await loadDashboard();
    selectOrder(orderId);
  } catch (error) {
    setReviewMessage(`保存失败：${error.message}`, "error");
  } finally {
    adminEls.saveReviewBtn.disabled = false;
  }
}

async function loadDashboard() {
  if (!window.location.protocol.startsWith("http")) {
    adminEls.ordersBody.innerHTML = '<tr><td colspan="7">请先通过线上地址访问网站，再查看后台数据</td></tr>';
    return;
  }

  const response = await fetch("/api/dashboard");
  const data = await response.json();

  dashboardOrders = data.orders || [];
  adminEls.statOrders.textContent = data.stats.totalOrders;
  adminEls.statPaid.textContent = data.stats.paidOrders;
  adminEls.statPending.textContent = data.stats.pendingOrders;
  adminEls.statRevenue.textContent = `￥${data.stats.totalRevenue}`;

  renderOrders(dashboardOrders);
  renderPayments(data.payments || []);
}

adminEls.refreshBtn.addEventListener("click", loadDashboard);
adminEls.addIssueBtn.addEventListener("click", () => {
  renderIssueEditors([...readIssueEditors(), emptyIssue()]);
});
adminEls.saveReviewBtn.addEventListener("click", saveReview);

renderIssueEditors();
loadDashboard();
