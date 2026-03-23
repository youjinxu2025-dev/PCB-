const authEls = {
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPhone: document.querySelector("#registerPhone"),
  registerPassword: document.querySelector("#registerPassword"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  registerBtn: document.querySelector("#registerBtn"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  authMessage: document.querySelector("#authMessage")
};

function setAuthMessage(text, type = "info") {
  authEls.authMessage.textContent = text;
  authEls.authMessage.dataset.state = type;
}

function saveCurrentUser(user) {
  localStorage.setItem("pcbCurrentUser", JSON.stringify(user));
}

async function register() {
  if (!window.location.protocol.startsWith("http")) {
    setAuthMessage("请先通过线上地址访问网站，再使用注册登录功能。", "error");
    return;
  }

  const payload = {
    name: authEls.registerName.value.trim(),
    email: authEls.registerEmail.value.trim(),
    phone: authEls.registerPhone.value.trim(),
    password: authEls.registerPassword.value.trim()
  };

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "注册失败");
    }

    saveCurrentUser(data.user);
    setAuthMessage(`注册成功，当前已登录账号：${data.user.name}`, "success");
  } catch (error) {
    setAuthMessage(`注册失败：${error.message}`, "error");
  }
}

async function login() {
  if (!window.location.protocol.startsWith("http")) {
    setAuthMessage("请先通过线上地址访问网站，再使用注册登录功能。", "error");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authEls.loginEmail.value.trim(),
        password: authEls.loginPassword.value.trim()
      })
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

authEls.registerBtn.addEventListener("click", register);
authEls.loginBtn.addEventListener("click", login);
authEls.logoutBtn.addEventListener("click", logout);
