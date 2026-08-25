import { apiRequest } from "./api.js";
import { selectMfaMethod, verifyMfaCode } from "./mfa.js";

/**
 * Global Registration Flow State
 */
const state = {
  currentScreen: "registration-screen",
  currentStep: 1, // Stepper indicator: 1: Details, 2: Email, 3: Mobile, 4: MFA Setup, 5: Success
  userId: null,
  email: "",
  phone: "",
  emailChallengeId: null,
  smsChallengeId: null,
  mfaChallengeId: null,
  selectedMfaMethod: "AUTHENTICATOR",
  authenticatorData: null,
  timers: {
    emailExpiry: null,
    emailResend: null,
    smsExpiry: null,
    smsResend: null,
    mfaExpiry: null,
  },
};

// DOM Elements
const screens = {
  registration: document.querySelector('[data-testid="registration-screen"]'),
  emailOtp: document.querySelector('[data-testid="email-otp-screen"]'),
  smsOtp: document.querySelector('[data-testid="sms-otp-screen"]'),
  mfaChoice: document.querySelector('[data-testid="mfa-choice-screen"]'),
  authenticatorSetup: document.querySelector('[data-testid="authenticator-setup-screen"]'),
  mfaVerify: document.querySelector('[data-testid="mfa-verify-screen"]'),
  success: document.querySelector('[data-testid="success-screen"]'),
};

// Stepper
function updateStepper(step) {
  state.currentStep = step;
  for (let i = 1; i <= 5; i++) {
    const dot = document.querySelector(`[data-testid="step-dot-${i}"]`);
    const line = document.querySelector(`[data-testid="step-line-${i}"]`);
    if (!dot) continue;

    dot.classList.remove("active", "completed");
    if (i < step) {
      dot.classList.add("completed");
      dot.innerHTML = "✓";
    } else if (i === step) {
      dot.classList.add("active");
      dot.textContent = i;
    } else {
      dot.textContent = i;
    }

    if (line) {
      if (i < step) {
        line.classList.add("completed");
      } else {
        line.classList.remove("completed");
      }
    }
  }
}

// Screen Switcher
window.showScreen = showScreen;
export function showScreen(screenKey) {
  Object.values(screens).forEach((s) => s?.removeAttribute("data-active"));
  if (screens[screenKey]) {
    screens[screenKey].setAttribute("data-active", "true");
    state.currentScreen = screenKey;
  }

  // Map screen to stepper
  switch (screenKey) {
    case "registration":
      updateStepper(1);
      break;
    case "emailOtp":
      updateStepper(2);
      break;
    case "smsOtp":
      updateStepper(3);
      break;
    case "mfaChoice":
    case "authenticatorSetup":
    case "mfaVerify":
      updateStepper(4);
      break;
    case "success":
      updateStepper(5);
      break;
  }
}

// --------------------------------------------------------------------------
// OTP Input Manager Utility
// --------------------------------------------------------------------------
function setupOtpInputs(containerId, onComplete) {
  const container = document.getElementById(containerId) || document.querySelector(`[data-testid="${containerId}"]`);
  if (!container) return { getOtp: () => "", clear: () => {}, setInvalid: () => {} };

  const inputs = Array.from(container.querySelectorAll("input"));

  inputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val ? val[val.length - 1] : "";

      inputs.forEach((i) => i.classList.remove("error"));

      if (e.target.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }

      const fullCode = inputs.map((i) => i.value).join("");
      if (fullCode.length === 6 && onComplete) {
        onComplete(fullCode);
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === "ArrowRight" && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData("text").trim();
      const digits = pasteData.replace(/\D/g, "").slice(0, 6);
      digits.split("").forEach((digit, i) => {
        if (inputs[i]) inputs[i].value = digit;
      });
      const nextIndex = Math.min(digits.length, inputs.length - 1);
      inputs[nextIndex]?.focus();

      const fullCode = inputs.map((i) => i.value).join("");
      if (fullCode.length === 6 && onComplete) {
        onComplete(fullCode);
      }
    });
  });

  return {
    getOtp: () => inputs.map((i) => i.value).join(""),
    clear: () => {
      inputs.forEach((i) => {
        i.value = "";
        i.classList.remove("error");
      });
      inputs[0]?.focus();
    },
    setInvalid: (isError = true) => {
      inputs.forEach((i) => {
        if (isError) i.classList.add("error");
        else i.classList.remove("error");
      });
    },
  };
}

// --------------------------------------------------------------------------
// Timer Utilities
// --------------------------------------------------------------------------
function startTimer(durationSeconds, displayElement, onExpire) {
  let remaining = durationSeconds;
  const updateDisplay = () => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    if (displayElement) {
      displayElement.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  };

  updateDisplay();
  const intervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(intervalId);
      updateDisplay();
      if (onExpire) onExpire();
    } else {
      updateDisplay();
    }
  }, 1000);

  return intervalId;
}

const regForm = document.querySelector('[data-testid="registration-form"]');
const fullnameInput = document.querySelector('[data-testid="reg-fullname"]');
const emailInput = document.querySelector('[data-testid="reg-email"]');
const mobileInput = document.querySelector('[data-testid="reg-mobile"]');
const passwordInput = document.querySelector('[data-testid="reg-password"]');
const togglePasswordBtn = document.querySelector('[data-testid="toggle-password-btn"]');
const regSubmitBtn = document.querySelector('[data-testid="reg-submit-btn"]');

// Live Password Validation Checklist
if (passwordInput) {
  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    const rules = {
      length: val.length >= 8,
      uppercase: /[A-Z]/.test(val),
      number: /[0-9]/.test(val),
      special: /[^A-Za-z0-9]/.test(val),
    };

    Object.entries(rules).forEach(([rule, valid]) => {
      const el = document.querySelector(`[data-testid="rule-${rule}"]`);
      if (el) {
        if (valid) {
          el.classList.add("password-rules__item--valid");
        } else {
          el.classList.remove("password-rules__item--valid");
        }
      }
    });
  });
}

// Password toggle visibility
if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    togglePasswordBtn.textContent = type === "password" ? "👁" : "🔒";
  });
}

// Client-side mirror validation
function validateRegForm(data) {
  const errors = {};
  if (!data.fullname.trim() || data.fullname.trim().length < 2) {
    errors.fullname = "Full name must be at least 2 characters.";
  }
  if (!data.email.trim() || !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!data.mobile.trim() || data.mobile.trim().length < 7) {
    errors.mobile = "Please enter a valid mobile number.";
  }
  if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password) || !/[^A-Za-z0-9]/.test(data.password)) {
    errors.password = "Password must satisfy all complexity requirements.";
  }
  if (!data.agreeTerms) {
    errors.agreeTerms = "You must agree to the Terms & Conditions.";
  }
  return errors;
}

function displayFieldErrors(errors) {
  ["fullname", "email", "mobile", "password", "agreeTerms", "form"].forEach((field) => {
    const errSpan = document.querySelector(`[data-testid="error-${field}"]`);
    const inputEl = document.querySelector(`[data-testid="reg-${field}"]`);
    if (errSpan) {
      errSpan.textContent = errors[field] || "";
      errSpan.style.display = errors[field] ? "block" : "none";
    }
    if (inputEl && inputEl.type !== "checkbox") {
      inputEl.setAttribute("aria-invalid", !!errors[field]);
    }
  });
}

if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = {
      fullname: fullnameInput?.value || "",
      email: emailInput?.value || "",
      mobile: mobileInput?.value || "",
      password: passwordInput?.value || "",
      agreeTerms: document.querySelector('[data-testid="reg-terms"]')?.checked || false,
    };

    const clientErrors = validateRegForm(formData);
    displayFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    regSubmitBtn.disabled = true;
    regSubmitBtn.textContent = "Creating account...";

    try {
      const response = await apiRequest("/register", {
        method: "POST",
        body: {
          name: formData.fullname,
          email: formData.email,
          phone: formData.mobile,
          password: formData.password,
        },
      });

      state.userId = response.userId;
      state.email = formData.email;
      state.phone = formData.mobile;
      state.emailChallengeId = response.challengeId;

      initEmailOtpScreen();
      showScreen("emailOtp");
    } catch (err) {
      if (err.details) {
        displayFieldErrors(err.details);
      } else {
        displayFieldErrors({ form: err.message });
      }
    } finally {
      regSubmitBtn.disabled = false;
      regSubmitBtn.textContent = "Create Account";
    }
  });
}

// --------------------------------------------------------------------------
// 2. Email OTP Screen (States 2, 2a, 2b)
// --------------------------------------------------------------------------
const emailOtpInputs = setupOtpInputs("email-otp-group", () => handleEmailOtpVerify());
const emailErrorBanner = document.querySelector('[data-testid="email-otp-error"]');
const emailExpiryTimerSpan = document.querySelector('[data-testid="email-expiry-timer"]');
const emailResendBtn = document.querySelector('[data-testid="email-resend-btn"]');
const emailVerifyBtn = document.querySelector('[data-testid="email-verify-btn"]');

function initEmailOtpScreen() {
  document.querySelector('[data-testid="email-otp-target"]').textContent = state.email;
  emailOtpInputs.clear();
  emailErrorBanner.style.display = "none";
  emailVerifyBtn.style.display = "flex";
  emailResendBtn.style.display = "none";

  clearInterval(state.timers.emailExpiry);
  state.timers.emailExpiry = startTimer(300, emailExpiryTimerSpan, () => {
    // Expired State (2b)
    emailErrorBanner.className = "alert-banner warning";
    emailErrorBanner.textContent = "This code has expired.";
    emailErrorBanner.style.display = "flex";
    emailOtpInputs.setInvalid(true);
    emailResendBtn.textContent = "Resend New Code";
    emailResendBtn.style.display = "flex";
  });
}

async function handleEmailOtpVerify() {
  const otp = emailOtpInputs.getOtp();
  if (otp.length !== 6) return;

  emailVerifyBtn.disabled = true;
  emailVerifyBtn.textContent = "Verifying...";
  emailErrorBanner.style.display = "none";

  try {
    await apiRequest("/verify-email-otp", {
      method: "POST",
      body: {
        userId: state.userId,
        challengeId: state.emailChallengeId,
        otp,
      },
    });

    // On Email verified, request SMS OTP challenge
    const smsRes = await apiRequest("/send-sms-otp", {
      method: "POST",
      body: { userId: state.userId },
    });

    state.smsChallengeId = smsRes.challengeId;
    initSmsOtpScreen();
    showScreen("smsOtp");
  } catch (err) {
    emailOtpInputs.setInvalid(true);
    emailErrorBanner.className = "alert-banner error";
    if (err.status === 410) {
      emailErrorBanner.textContent = "This code has expired.";
      emailResendBtn.style.display = "flex";
    } else if (err.details && err.details.attemptsRemaining !== undefined) {
      emailErrorBanner.textContent = `Incorrect code. Please try again. You have ${err.details.attemptsRemaining} attempts left.`;
    } else {
      emailErrorBanner.textContent = err.message;
    }
    emailErrorBanner.style.display = "flex";
  } finally {
    emailVerifyBtn.disabled = false;
    emailVerifyBtn.textContent = "Verify Email";
  }
}

if (emailVerifyBtn) {
  emailVerifyBtn.addEventListener("click", handleEmailOtpVerify);
}

if (emailResendBtn) {
  emailResendBtn.addEventListener("click", async () => {
    try {
      emailResendBtn.disabled = true;
      const res = await apiRequest("/send-email-otp", {
        method: "POST",
        body: { userId: state.userId },
      });
      state.emailChallengeId = res.challengeId;
      initEmailOtpScreen();
    } catch (err) {
      emailErrorBanner.className = "alert-banner error";
      emailErrorBanner.textContent = err.message;
      emailErrorBanner.style.display = "flex";
    } finally {
      emailResendBtn.disabled = false;
    }
  });
}

// --------------------------------------------------------------------------
// 3. Mobile / SMS OTP Screen (States 3, 3a, 3b)
// --------------------------------------------------------------------------
const smsOtpInputs = setupOtpInputs("sms-otp-group", () => handleSmsOtpVerify());
const smsErrorBanner = document.querySelector('[data-testid="sms-otp-error"]');
const smsExpiryTimerSpan = document.querySelector('[data-testid="sms-expiry-timer"]');
const smsResendBtn = document.querySelector('[data-testid="sms-resend-btn"]');
const smsVerifyBtn = document.querySelector('[data-testid="sms-verify-btn"]');

function initSmsOtpScreen() {
  document.querySelector('[data-testid="sms-otp-target"]').textContent = state.phone;
  smsOtpInputs.clear();
  smsErrorBanner.style.display = "none";
  smsVerifyBtn.style.display = "flex";
  smsVerifyBtn.disabled = false;
  smsResendBtn.style.display = "none";

  clearInterval(state.timers.smsExpiry);
  state.timers.smsExpiry = startTimer(300, smsExpiryTimerSpan, () => {
    smsErrorBanner.className = "alert-banner warning";
    smsErrorBanner.textContent = "This code has expired.";
    smsErrorBanner.style.display = "flex";
    smsOtpInputs.setInvalid(true);
    smsResendBtn.textContent = "Resend New Code";
    smsResendBtn.style.display = "flex";
  });
}

async function handleSmsOtpVerify() {
  const otp = smsOtpInputs.getOtp();
  if (otp.length !== 6) return;

  smsVerifyBtn.disabled = true;
  smsVerifyBtn.textContent = "Verifying...";
  smsErrorBanner.style.display = "none";

  try {
    await apiRequest("/verify-sms-otp", {
      method: "POST",
      body: {
        userId: state.userId,
        challengeId: state.smsChallengeId,
        otp,
      },
    });

    // SMS verified -> proceed to Set Up MFA (Screen 4)
    showScreen("mfaChoice");
  } catch (err) {
    smsOtpInputs.setInvalid(true);
    smsErrorBanner.className = "alert-banner error";
    if (err.status === 429) {
      // State 3b: Max attempts reached
      smsErrorBanner.textContent = "Maximum attempts reached. Please request a new code.";
      smsVerifyBtn.disabled = true;
      smsResendBtn.textContent = "Resend New Code";
      smsResendBtn.style.display = "flex";
    } else if (err.details && err.details.attemptsRemaining !== undefined) {
      smsErrorBanner.textContent = `Incorrect code. Please try again. You have ${err.details.attemptsRemaining} attempts left.`;
    } else {
      smsErrorBanner.textContent = err.message;
    }
    smsErrorBanner.style.display = "flex";
  } finally {
    smsVerifyBtn.disabled = false;
    smsVerifyBtn.textContent = "Verify Mobile";
  }
}

if (smsVerifyBtn) {
  smsVerifyBtn.addEventListener("click", handleSmsOtpVerify);
}

if (smsResendBtn) {
  smsResendBtn.addEventListener("click", async () => {
    try {
      smsResendBtn.disabled = true;
      const res = await apiRequest("/send-sms-otp", {
        method: "POST",
        body: { userId: state.userId },
      });
      state.smsChallengeId = res.challengeId;
      initSmsOtpScreen();
    } catch (err) {
      smsErrorBanner.className = "alert-banner error";
      smsErrorBanner.textContent = err.message;
      smsErrorBanner.style.display = "flex";
    } finally {
      smsResendBtn.disabled = false;
    }
  });
}

// --------------------------------------------------------------------------
// 4. Set Up MFA Screen (Screen 4)
// --------------------------------------------------------------------------
const mfaChoiceForm = document.querySelector('[data-testid="mfa-choice-form"]');
const mfaMethodRadios = document.querySelectorAll('input[name="mfa-method"]');
const mfaChoiceContinueBtn = document.querySelector('[data-testid="mfa-choice-continue-btn"]');

mfaMethodRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    document.querySelectorAll(".mfa-option-card").forEach((card) => card.classList.remove("selected"));
    e.target.closest(".mfa-option-card")?.classList.add("selected");
    state.selectedMfaMethod = e.target.value;
  });
});

if (mfaChoiceForm) {
  mfaChoiceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    mfaChoiceContinueBtn.disabled = true;
    mfaChoiceContinueBtn.textContent = "Setting up...";

    try {
      const result = await selectMfaMethod(state.userId, state.selectedMfaMethod);

      if (state.selectedMfaMethod === "AUTHENTICATOR") {
        // Authenticator Setup Screen (Screen 5)
        state.authenticatorData = result;
        state.mfaChallengeId = result.challengeId;
        document.querySelector('[data-testid="qr-image-el"]').src = result.qrCodeDataUrl;
        document.querySelector('[data-testid="manual-secret-key"]').textContent = result.base32Secret;
        showScreen("authenticatorSetup");
      } else {
        // SMS or Email MFA Verification (Screen 6)
        state.mfaChallengeId = result.challengeId;
        initMfaVerifyScreen(state.selectedMfaMethod);
        showScreen("mfaVerify");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      mfaChoiceContinueBtn.disabled = false;
      mfaChoiceContinueBtn.textContent = "Continue";
    }
  });
}

// --------------------------------------------------------------------------
// 5. Authenticator Setup Screen (Screen 5)
// --------------------------------------------------------------------------
const authSetupContinueBtn = document.querySelector('[data-testid="auth-setup-continue-btn"]');
const authSetupBackBtn = document.querySelector('[data-testid="auth-setup-back-btn"]');
const toggleManualKeyBtn = document.querySelector('[data-testid="toggle-manual-key-btn"]');
const manualKeyContainer = document.querySelector('[data-testid="manual-key-container"]');

if (toggleManualKeyBtn && manualKeyContainer) {
  toggleManualKeyBtn.addEventListener("click", () => {
    const isHidden = manualKeyContainer.style.display === "none";
    manualKeyContainer.style.display = isHidden ? "block" : "none";
    toggleManualKeyBtn.textContent = isHidden ? "Hide setup key" : "Can't scan? Enter setup key";
  });
}

if (authSetupBackBtn) {
  authSetupBackBtn.addEventListener("click", () => {
    showScreen("mfaChoice");
  });
}

if (authSetupContinueBtn) {
  authSetupContinueBtn.addEventListener("click", () => {
    initMfaVerifyScreen("AUTHENTICATOR");
    showScreen("mfaVerify");
  });
}

// --------------------------------------------------------------------------
// 6. MFA Verification Screen (Screens 6, 6a)
// --------------------------------------------------------------------------
const mfaOtpInputs = setupOtpInputs("mfa-otp-group", () => handleMfaVerify());
const mfaErrorBanner = document.querySelector('[data-testid="mfa-error-banner"]');
const mfaSubtitleEl = document.querySelector('[data-testid="mfa-verify-subtitle"]');
const mfaVerifySubmitBtn = document.querySelector('[data-testid="mfa-verify-submit-btn"]');

function initMfaVerifyScreen(method) {
  mfaOtpInputs.clear();
  mfaErrorBanner.style.display = "none";
  mfaVerifySubmitBtn.disabled = false;

  if (method === "AUTHENTICATOR") {
    mfaSubtitleEl.textContent = "Enter the code from your authenticator app";
  } else if (method === "SMS") {
    mfaSubtitleEl.textContent = `Enter the code sent to ${state.phone}`;
  } else {
    mfaSubtitleEl.textContent = `Enter the code sent to ${state.email}`;
  }
}

async function handleMfaVerify() {
  const code = mfaOtpInputs.getOtp();
  if (code.length !== 6) return;

  mfaVerifySubmitBtn.disabled = true;
  mfaVerifySubmitBtn.textContent = "Verifying...";
  mfaErrorBanner.style.display = "none";

  try {
    const response = await verifyMfaCode({
      userId: state.userId,
      method: state.selectedMfaMethod,
      code,
      challengeId: state.mfaChallengeId,
    });

    if (response.registrationComplete) {
      showScreen("success");
    }
  } catch (err) {
    mfaOtpInputs.setInvalid(true);
    mfaErrorBanner.className = "alert-banner error";
    if (err.details && err.details.attemptsRemaining !== undefined) {
      mfaErrorBanner.textContent = `Invalid code. Please try again. You have ${err.details.attemptsRemaining} attempts left.`;
    } else {
      mfaErrorBanner.textContent = err.message;
    }
    mfaErrorBanner.style.display = "flex";
  } finally {
    mfaVerifySubmitBtn.disabled = false;
    mfaVerifySubmitBtn.textContent = "Verify & Complete";
  }
}

if (mfaVerifySubmitBtn) {
  mfaVerifySubmitBtn.addEventListener("click", handleMfaVerify);
}

// --------------------------------------------------------------------------
// 7. Success Screen (Screen 7)
// --------------------------------------------------------------------------
const continueLoginBtn = document.querySelector('[data-testid="continue-to-login-btn"]');
if (continueLoginBtn) {
  continueLoginBtn.addEventListener("click", () => {
    alert("Part 1 Complete! Login & Session Management is Part 2.");
  });
}

// Initial Screen Setup
document.addEventListener("DOMContentLoaded", () => {
  showScreen("registration");
});

// Mobile Keypad wiring
const keypadBtns = document.querySelectorAll('.mobile-keypad__btn');
keypadBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const key = e.target.getAttribute('data-key');
    if (key === 'blank') return;
    
    // Find active OTP input
    const activeScreen = document.querySelector('.screen[data-active="true"]');
    if (!activeScreen) return;
    const otpGroup = activeScreen.querySelector('.otp-input');
    if (!otpGroup) return;
    const inputs = Array.from(otpGroup.querySelectorAll('input'));
    const activeInput = document.activeElement;
    let currentIndex = inputs.indexOf(activeInput);
    
    if (currentIndex === -1) {
      // If none active, find first empty
      currentIndex = inputs.findIndex(i => !i.value);
      if (currentIndex === -1) currentIndex = inputs.length - 1;
    }
    
    if (key === 'backspace') {
      if (!inputs[currentIndex].value && currentIndex > 0) {
        inputs[currentIndex - 1].value = '';
        inputs[currentIndex - 1].focus();
      } else {
        inputs[currentIndex].value = '';
      }
    } else {
      inputs[currentIndex].value = key;
      if (currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      }
      inputs[currentIndex].dispatchEvent(new Event('input', { bubbles: true })); // trigger validation
    }
  });
});
