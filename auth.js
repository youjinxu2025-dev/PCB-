const authEls = {
  registerName: document.querySelector("#registerName"),
  registerPhone: document.querySelector("#registerPhone"),
  registerCode: document.querySelector("#registerCode"),
  registerPassword: document.querySelector("#registerPassword"),
  registerPasswordConfirm: document.querySelector("#registerPasswordConfirm"),
  loginPhone: document.querySelector("#loginPhone"),
  loginPassword: document.querySelector("#loginPassword"),
  resetPhone: document.querySelector("#resetPhone"),
  resetCode: document.querySelector("#resetCode"),
  resetPassword: document.querySelector("#resetPassword"),
  resetPasswordConfirm: document.querySelector("#resetPasswordConfirm"),
  sendCodeBtn: document.querySelector("#sendCodeBtn"),
  sendResetCodeBtn: document.querySelector("#sendResetCodeBtn"),
  registerBtn: document.querySelector("#registerBtn"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  resetPasswordBtn: document.querySelector("#resetPasswordBtn"),
  authMessage: document.querySelector("#authMessage"),
  modeButtons: document.querySelectorAll(".auth-mode-btn"),
  panes: document.querySelectorAll(".auth-pane")
};

const countdownState = {
  register: { seconds: 0, timer: null, button: authEls.sendCodeBtn, idleText: "获取验证码" },
  reset: { seconds: 0, timer: null, button: authEls.sendResetCodeBtn, idleText: "发送找回码" }
};

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

function switchMode(mode) {
  authEls.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  authEls.panes.forEach((pane) => {
    pane.classList.toggle("active", pane.id === `${mode}Pane`);
  });
}

function updateCountdownButton(type) {
  const state = countdownState[type];
  if (state.seconds > 0) {
    state.button.disabled = true;
    state.button.textContent = `${state.seconds}s 后重发`;
    return;
  }

  state.button.disabled = false;
  state.button.textContent = state.idleText;
}

function startCountdown(type, seconds = 60) {
  const state = countdownState[type];
  state.seconds = seconds;
  updateCountdownButton(type);

  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = window.setInterval(() => {
    state.seconds -= 1;
    if (state.seconds <= 0) {
      state.seconds = 0;
      clearInterval(state.timer);
      state.timer = null;
    }
    updateCountdownButton(type);
  }, 1000);
}

async function sendSmsCode(type) {
  if (!isServerMode()) {
    setAuthMessage("请先通过线上地址访问网站，再使用短信验证功能。", "error");
    return;
  }

  const isRegister = type === "register";
  const phone = normalizePhone(isRegister ? authEls.registerPhone.value : authEls.resetPhone.value);
  const name = authEls.registerName.value.trim();

  if (isRegister && !name) {
    setAuthMessage("注册前请先填写姓名或称呼。", "error");
    return;
  }

  if (!/^1\d{10}$/.test(phone)) {
    setAuthMessage("请输入有效的 11 位手机号。", "error");
    return;
  }

  countdownState[type].button.disabled = true;
  setAuthMessage("正在发送短信验证码...", "loading");

  try {
    const response = await fetch("/api/sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: type })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "验证码发送失败");
    }

    startCountdown(type, 60);
    const demoSuffix = data.demoCode ? ` 当前演示环境验证码：${data.demoCode}。` : "";
    setAuthMessage(`验证码已发送到手机号 ${phone}。${demoSuffix}`, "success");
  } catch (error) {
    countdownState[type].seconds = 0;
    updateCountdownButton(type);
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
    switchMode("login");
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

async function resetPassword() {
  if (!isServerMode()) {
    setAuthMessage("请先通过线上地址访问网站，再使用找回密码功能。", "error");
    return;
  }

  const phone = normalizePhone(authEls.resetPhone.value);
  const code = authEls.resetCode.value.trim();
  const password = authEls.resetPassword.value.trim();
  const passwordConfirm = authEls.resetPasswordConfirm.value.trim();

  if (!/^1\d{10}$/.test(phone) || !code || !password || !passwordConfirm) {
    setAuthMessage("请完整填写手机号、验证码和新密码。", "error");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("新密码至少需要 6 位。", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setAuthMessage("两次输入的新密码不一致。", "error");
    return;
  }

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "重置密码失败");
    }

    setAuthMessage(`密码已重置成功，现在可以用手机号 ${phone} 重新登录。`, "success");
    authEls.loginPhone.value = phone;
    authEls.loginPassword.value = password;
    switchMode("login");
  } catch (error) {
    setAuthMessage(`重置密码失败：${error.message}`, "error");
  }
}

function logout() {
  localStorage.removeItem("pcbCurrentUser");
  setAuthMessage("已退出登录。", "info");
}

authEls.modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});
authEls.sendCodeBtn.addEventListener("click", () => sendSmsCode("register"));
authEls.sendResetCodeBtn.addEventListener("click", () => sendSmsCode("reset"));
authEls.registerBtn.addEventListener("click", register);
authEls.loginBtn.addEventListener("click", login);
authEls.logoutBtn.addEventListener("click", logout);
authEls.resetPasswordBtn.addEventListener("click", resetPassword);
updateCountdownButton("register");
updateCountdownButton("reset");
switchMode("login");
