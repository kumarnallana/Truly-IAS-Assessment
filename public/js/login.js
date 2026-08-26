import { apiRequest } from "./api.js";

const state = {
  loginToken: null,
  method: "EMAIL",
  challengeId: null,
  expiresAt: null,
  verifying: false,
  expiryTimer: null,
  resendTimer: null,
};

const screens = Array.from(document.querySelectorAll(".screen"));
const loginForm = document.querySelector('[data-testid="login-form"]');
const emailInput = document.querySelector('[data-testid="login-email"]');
const passwordInput = document.querySelector('[data-testid="login-password"]');
const rememberInput = document.querySelector('[data-testid="login-remember"]');
const loginButton = document.querySelector('[data-testid="login-submit-btn"]');
const loginError = document.querySelector('[data-testid="error-login"]');
const methodForm = document.querySelector('[data-testid="login-mfa-choice-form"]');
const methodButton = document.querySelector('[data-testid="login-mfa-choice-continue-btn"]');
const methodError = document.querySelector('[data-testid="login-method-error"]');
const otpForm = document.querySelector('[data-testid="login-otp-form"]');
const otpInputs = Array.from(document.querySelectorAll('[data-testid="login-otp-group"] .otp-input__box'));
const otpError = document.querySelector('[data-testid="login-otp-error"]');
const otpErrorMessage = document.querySelector('[data-testid="login-otp-error-message"]');
const otpExpired = document.querySelector('[data-testid="login-otp-expired"]');
const otpTimerText = document.querySelector('[data-testid="login-otp-timer-text"]');
const otpTimer = document.querySelector('[data-testid="login-expiry-timer"]');
const expiredTimerText = document.querySelector('[data-testid="login-otp-expired-timer-text"]');
const resendButton = document.querySelector('[data-testid="login-resend-btn"]');
const resendLink = document.querySelector('[data-testid="login-resend-link"]');
const resendFooter = resendLink?.closest(".auth-footer");

window.showScreen = showScreen;

function showScreen(screenId) {
  screens.forEach((screen) => screen.setAttribute("data-active", "false"));
  const activeScreen = document.querySelector(`[data-testid="${screenId}"]`);
  if (activeScreen) {
    activeScreen.classList.remove("hidden");
    activeScreen.setAttribute("data-active", "true");
  }
}

function setButtonLoading(button, loading, idleLabel, loadingLabel) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? loadingLabel : idleLabel;
}

function setLoginError(message = "") {
  const visible = Boolean(message);
  loginError.textContent = message;
  loginError.classList.toggle("hidden", !visible);
  emailInput.classList.toggle("input--error", visible);
  passwordInput.classList.toggle("input--error", visible);
  emailInput.setAttribute("aria-invalid", String(visible));
  passwordInput.setAttribute("aria-invalid", String(visible));
}

function clearOtpState({ clearInputs = false } = {}) {
  otpError.classList.add("hidden");
  otpExpired.classList.add("hidden");
  otpInputs.forEach((input) => input.classList.remove("input--error", "error"));
  if (clearInputs) otpInputs.forEach((input) => { input.value = ""; });
}

function readOtp() {
  return otpInputs.map((input) => input.value).join("");
}

function focusFirstEmptyOtp() {
  const target = otpInputs.find((input) => !input.value) || otpInputs.at(-1);
  target?.focus();
}

function formatRemaining(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function stopTimers() {
  clearInterval(state.expiryTimer);
  clearInterval(state.resendTimer);
  state.expiryTimer = null;
  state.resendTimer = null;
}

function showExpiredState() {
  clearInterval(state.expiryTimer);
  otpExpired.classList.remove("hidden");
  otpTimerText.classList.add("hidden");
  expiredTimerText.classList.remove("hidden");
  resendFooter?.classList.add("hidden");
  if (state.method !== "AUTHENTICATOR") resendButton.classList.remove("hidden");
  otpInputs.forEach((input) => input.classList.add("input--error"));
}

function startExpiryTimer(expiresAt) {
  clearInterval(state.expiryTimer);
  const update = () => {
    const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
    otpTimer.textContent = formatRemaining(remaining);
    if (remaining <= 0) showExpiredState();
  };
  update();
  state.expiryTimer = setInterval(update, 1000);
}

function startResendTimer(seconds = 25) {
  clearInterval(state.resendTimer);
  if (state.method === "AUTHENTICATOR") {
    resendFooter?.classList.add("hidden");
    resendButton.classList.add("hidden");
    return;
  }
  let remaining = seconds;
  resendFooter?.classList.remove("hidden");
  resendButton.classList.add("hidden");
  resendLink.disabled = true;
  const update = () => {
    resendLink.textContent = remaining > 0 ? `Resend code (${formatRemaining(remaining)})` : "Resend code";
    resendLink.disabled = remaining > 0;
    if (remaining <= 0) clearInterval(state.resendTimer);
    remaining -= 1;
  };
  update();
  state.resendTimer = setInterval(update, 1000);
}

function updateSelectedMethodCard() {
  document.querySelectorAll(".mfa-option-card").forEach((card) => {
    card.classList.toggle("selected", Boolean(card.querySelector("input")?.checked));
  });
}

function renderAvailableMethods(methods) {
  const byMethod = new Map(methods.map((item) => [item.method, item]));
  document.querySelectorAll(".mfa-option-card[data-method]").forEach((card) => {
    const radio = card.querySelector("input");
    const available = byMethod.has(card.dataset.method);
    radio.disabled = !available;
    card.classList.toggle("mfa-option-card--disabled", !available);
    card.hidden = !available;
  });
  const emailMethod = byMethod.get("EMAIL");
  const smsMethod = byMethod.get("SMS");
  if (emailMethod) document.querySelector('[data-testid="login-email-target"]').textContent = `Send a code to ${emailMethod.target}`;
  if (smsMethod) document.querySelector('[data-testid="login-sms-target"]').textContent = `Send a code to ${smsMethod.target}`;
  const firstAvailable = document.querySelector('input[name="login-mfa-method"]:not(:disabled)');
  if (firstAvailable) {
    firstAvailable.checked = true;
    state.method = firstAvailable.value;
    updateSelectedMethodCard();
  }
}

function renderOtpScreen(challenge) {
  const title = document.querySelector('[data-testid="login-otp-title"]');
  const icon = document.querySelector('[data-testid="login-otp-icon"]');
  const instructions = document.querySelector('[data-testid="login-otp-instructions"]');
  const target = document.querySelector('[data-testid="login-otp-target"]');
  state.method = challenge.method;
  state.challengeId = challenge.challengeId;
  state.expiresAt = challenge.expiresAt;
  clearOtpState({ clearInputs: true });
  otpTimerText.classList.remove("hidden");
  expiredTimerText.classList.add("hidden");
  if (challenge.method === "AUTHENTICATOR") {
    title.textContent = "Authenticator Verification";
    icon.textContent = "🔒";
    instructions.firstChild.textContent = "Enter the current 6-digit code from your ";
    target.textContent = "authenticator app";
  } else if (challenge.method === "SMS") {
    title.textContent = "Mobile Verification";
    icon.textContent = "💬";
    instructions.firstChild.textContent = "Enter the 6-digit code sent to ";
    target.textContent = challenge.target;
  } else {
    title.textContent = "Email Verification";
    icon.textContent = "✉️";
    instructions.firstChild.textContent = "Enter the 6-digit code sent to ";
    target.textContent = challenge.target;
  }
  showScreen("login-otp-screen");
  startExpiryTimer(challenge.expiresAt);
  startResendTimer();
  focusFirstEmptyOtp();
}

async function submitLogin() {
  const identifier = emailInput.value.trim();
  const password = passwordInput.value;
  if (!identifier || !password) {
    setLoginError("Enter your email and password.");
    return;
  }
  setLoginError();
  setButtonLoading(loginButton, true, "Login", "Signing in...");
  try {
    const response = await apiRequest("/login", {
      method: "POST",
      body: { identifier, password, rememberMe: rememberInput.checked },
    });
    state.loginToken = response.loginToken;
    renderAvailableMethods(response.methods || []);
    passwordInput.value = "";
    showScreen("login-mfa-choice-screen");
  } catch (error) {
    setLoginError(error.code === "RATE_LIMITED" ? error.message : "Invalid email or password. Please try again.");
  } finally {
    setButtonLoading(loginButton, false, "Login", "Signing in...");
  }
}

async function createChallenge() {
  const selected = document.querySelector('input[name="login-mfa-method"]:checked:not(:disabled)');
  if (!selected || !state.loginToken) return;
  state.method = selected.value;
  methodError.classList.add("hidden");
  setButtonLoading(methodButton, true, "Continue", "Sending...");
  try {
    const challenge = await apiRequest("/login/challenge", {
      method: "POST",
      body: { loginToken: state.loginToken, method: state.method },
    });
    renderOtpScreen(challenge);
  } catch (error) {
    if (["LOGIN_TRANSACTION_INVALID", "LOGIN_TRANSACTION_EXPIRED"].includes(error.code)) {
      state.loginToken = null;
      setLoginError("Your login attempt expired. Please sign in again.");
      showScreen("login-screen");
    } else {
      methodError.textContent = error.message;
      methodError.classList.remove("hidden");
    }
  } finally {
    setButtonLoading(methodButton, false, "Continue", "Sending...");
  }
}

async function verifyCode() {
  const otp = readOtp();
  if (otp.length !== 6 || state.verifying || !state.loginToken || !state.challengeId) return;
  state.verifying = true;
  clearOtpState();
  otpInputs.forEach((input) => { input.disabled = true; });
  try {
    const response = await apiRequest("/verify-login-otp", {
      method: "POST",
      body: { loginToken: state.loginToken, method: state.method, challengeId: state.challengeId, otp },
    });
    state.loginToken = null;
    stopTimers();
    window.location.assign(response.redirectTo || "/dashboard.html");
  } catch (error) {
    otpInputs.forEach((input) => input.classList.add("input--error"));
    if (error.code === "OTP_EXPIRED" || error.code === "LOGIN_TRANSACTION_EXPIRED") {
      showExpiredState();
    } else {
      const remaining = error.details?.attemptsRemaining;
      otpErrorMessage.textContent = error.message;
      if (remaining !== undefined) {
        otpErrorMessage.append(
          document.createElement("br"),
          document.createTextNode(`You have ${remaining} attempt${remaining === 1 ? "" : "s"} left.`),
        );
      }
      otpError.classList.remove("hidden");
    }
  } finally {
    state.verifying = false;
    otpInputs.forEach((input) => { input.disabled = false; });
  }
}

async function resendCode() {
  if (!state.loginToken || state.method === "AUTHENTICATOR") return;
  resendButton.disabled = true;
  resendLink.disabled = true;
  try {
    const challenge = await apiRequest("/login/challenge", {
      method: "POST",
      body: { loginToken: state.loginToken, method: state.method },
    });
    renderOtpScreen(challenge);
  } catch (error) {
    otpErrorMessage.textContent = error.message;
    otpError.classList.remove("hidden");
  } finally {
    resendButton.disabled = false;
  }
}

loginForm?.addEventListener("submit", (event) => { event.preventDefault(); submitLogin(); });
methodForm?.addEventListener("submit", (event) => { event.preventDefault(); createChallenge(); });
otpForm?.addEventListener("submit", (event) => { event.preventDefault(); verifyCode(); });

document.querySelectorAll('input[name="login-mfa-method"]').forEach((radio) => {
  radio.addEventListener("change", updateSelectedMethodCard);
});

document.querySelector('[data-testid="toggle-login-password-btn"]')?.addEventListener("click", (event) => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  event.currentTarget.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
});
document.querySelector('[data-testid="login-method-back-btn"]')?.addEventListener("click", () => showScreen("login-screen"));
document.querySelector('[data-testid="login-otp-back-btn"]')?.addEventListener("click", () => {
  stopTimers();
  showScreen("login-mfa-choice-screen");
});

function showScopeNotice(message) {
  const notice = document.querySelector('[data-testid="login-scope-notice"]');
  notice.textContent = message;
  notice.classList.remove("hidden");
}
document.querySelector('[data-testid="forgot-password-link"]')?.addEventListener("click", () => {
  showScopeNotice("Password recovery is outside this assessment's required backend scope.");
});
document.querySelector('[data-testid="login-google-btn"]')?.addEventListener("click", () => {
  showScopeNotice("Google sign-in is a reference-only control and is not enabled for this first-party SecureID assessment.");
});

otpInputs.forEach((input, index) => {
  input.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(-1);
    clearOtpState();
    if (event.target.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
    if (readOtp().length === 6) verifyCode();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && index > 0) otpInputs[index - 1].focus();
    if (event.key === "ArrowLeft" && index > 0) otpInputs[index - 1].focus();
    if (event.key === "ArrowRight" && index < otpInputs.length - 1) otpInputs[index + 1].focus();
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    digits.split("").forEach((digit, digitIndex) => { otpInputs[digitIndex].value = digit; });
    focusFirstEmptyOtp();
    if (digits.length === 6) verifyCode();
  });
});

document.querySelectorAll(".mobile-keypad__btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const key = button.dataset.key;
    if (key === "blank") return;
    if (key === "backspace") {
      for (let index = otpInputs.length - 1; index >= 0; index -= 1) {
        if (otpInputs[index].value) {
          otpInputs[index].value = "";
          otpInputs[index].focus();
          clearOtpState();
          return;
        }
      }
      return;
    }
    const target = otpInputs.find((input) => !input.value);
    if (!target) return;
    target.value = key;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

resendLink?.addEventListener("click", resendCode);
resendButton?.addEventListener("click", resendCode);

document.addEventListener("DOMContentLoaded", async () => {
  showScreen("login-screen");
  try {
    const response = await apiRequest("/me", { method: "GET", csrf: false });
    if (response.authenticated) window.location.replace("/dashboard.html");
  } catch {
    // A missing or expired session is the expected initial login state.
  }
});
