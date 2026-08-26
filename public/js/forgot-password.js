import { apiRequest } from "./api.js";
import { setFieldErrors, clearFieldError, checkPasswordStrength } from "./validation.js";

function setupOtpInputs(containerId, onComplete) {
  const container = typeof containerId === 'string' ? (document.getElementById(containerId) || document.querySelector(`[data-testid="${containerId}"]`)) : containerId;
  if (!container) return { getOtp: () => "", clear: () => {}, setInvalid: () => {} };

  const inputs = Array.from(container.querySelectorAll("input"));

  inputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val ? val[val.length - 1] : "";

      inputs.forEach((i) => i.classList.remove("otp-input__box--error"));

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
    clear: () => inputs.forEach((i) => (i.value = "")),
    setInvalid: (isInvalid) => inputs.forEach((i) => i.classList.toggle("otp-input__box--error", isInvalid)),
  };
}

const state = {
  currentScreen: "fp-email-screen",
  email: "",
  challengeId: null,
  expiryTimer: null,
};

const screens = {
  email: document.querySelector('[data-testid="fp-email-screen"]'),
  reset: document.querySelector('[data-testid="fp-reset-screen"]'),
};

function showScreen(screenKey) {
  Object.values(screens).forEach((s) => s?.removeAttribute("data-active"));
  if (screens[screenKey]) {
    screens[screenKey].setAttribute("data-active", "true");
    state.currentScreen = screenKey;
  }
}

function showFeedback(element, type, title, message) {
  if (!element) return;
  element.className = `feedback feedback--${type}`;
  element.querySelector(".feedback__content").innerHTML = `<strong>${title}</strong>${message ? `<br>${message}` : ""}`;
}

function startExpiryTimer(durationSeconds, displayElement, onExpire) {
  let remaining = durationSeconds;
  
  function updateDisplay() {
    if (!displayElement) return;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    displayElement.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

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

function stopTimer() {
  if (state.expiryTimer) {
    clearInterval(state.expiryTimer);
    state.expiryTimer = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const emailForm = document.querySelector('[data-testid="fp-email-form"]');
  const emailInput = document.getElementById("fp-email-input");
  const emailErrorBanner = document.getElementById("error-fp-email");
  
  const resetForm = document.querySelector('[data-testid="fp-reset-form"]');
  const otpContainer = document.querySelector('[data-testid="fp-otp-container"]');
  const resetErrorBanner = document.getElementById("error-fp-reset");
  const expiryTimerSpan = document.getElementById("fp-expiry-timer");
  const resendBtn = document.getElementById("fp-resend-btn");
  
  const targetEmailSpan = document.querySelector('[data-testid="fp-target-email"]');
  
  const newPasswordInput = document.getElementById("fp-new-password");
  const confirmPasswordInput = document.getElementById("fp-confirm-password");
  const reqList = document.getElementById("fp-password-requirements");

  const backToEmailBtn = document.querySelector('[data-testid="fp-reset-back-btn"]');

  // Setup OTP inputs
  const otpInputs = setupOtpInputs(otpContainer);

  // Setup password toggles
  document.querySelectorAll(".form-field__password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      const type = input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
    });
  });

  // Password strength
  if (newPasswordInput && reqList) {
    newPasswordInput.addEventListener("input", (e) => {
      checkPasswordStrength(e.target.value, reqList);
      clearFieldError("fp-password");
    });
  }

  // Clear errors on input
  emailInput?.addEventListener("input", () => clearFieldError("fp-email"));
  confirmPasswordInput?.addEventListener("input", () => clearFieldError("fp-confirm"));

  // Navigation
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener("click", () => {
      stopTimer();
      showScreen("email");
    });
  }

  // STEP 1: Request Reset
  if (emailForm) {
    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldError("fp-email");
      if (emailErrorBanner) emailErrorBanner.classList.add("hidden");

      const email = emailInput.value.trim();
      if (!email) {
        setFieldErrors({ "fp-email": "Email is required." });
        return;
      }

      const submitBtn = emailForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      try {
        const response = await apiRequest("/forgot-password/request", { email });
        
        state.email = email;
        state.challengeId = response.challengeId;
        
        if (targetEmailSpan) targetEmailSpan.textContent = email;
        
        // Reset OTP fields
        otpInputs.clear();
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        
        // Start timer
        stopTimer();
        state.expiryTimer = startExpiryTimer(600, expiryTimerSpan, () => {
          showFeedback(resetErrorBanner, "error", "This recovery code has expired.", "Please request a new code.");
          otpInputs.setInvalid(true);
        });

        showScreen("reset");
      } catch (error) {
        if (error.details) {
          setFieldErrors({ "fp-email": error.details.email || "Invalid email" });
        } else {
          showFeedback(emailErrorBanner, "error", error.message);
          emailErrorBanner.classList.remove("hidden");
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // STEP 2: Verify OTP & Reset Password
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldError("fp-password");
      clearFieldError("fp-confirm");
      if (resetErrorBanner) resetErrorBanner.classList.add("hidden");

      const otp = otpInputs.getOtp();
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (otp.length !== 6) {
        otpInputs.setInvalid(true);
        showFeedback(resetErrorBanner, "error", "Please enter the full 6-digit code.");
        resetErrorBanner.classList.remove("hidden");
        return;
      }

      if (newPassword !== confirmPassword) {
        setFieldErrors({ "fp-confirm": "Passwords do not match." });
        return;
      }

      const submitBtn = resetForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Resetting...";

      try {
        await apiRequest("/forgot-password/reset", {
          challengeId: state.challengeId,
          otp,
          newPassword,
        });

        stopTimer();
        window.location.assign("/login.html?reset=success");
      } catch (error) {
        if (error.code === "VALIDATION_ERROR" && error.details?.newPassword) {
          setFieldErrors({ "fp-password": error.details.newPassword });
        } else {
          showFeedback(resetErrorBanner, "error", error.message);
          resetErrorBanner.classList.remove("hidden");
          if (error.code === "INVALID_OTP") {
            otpInputs.setInvalid(true);
            otpInputs.clear();
          }
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Resend
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (resetErrorBanner) resetErrorBanner.classList.add("hidden");
      try {
        resendBtn.disabled = true;
        const response = await apiRequest("/forgot-password/request", { email: state.email });
        state.challengeId = response.challengeId;
        
        stopTimer();
        state.expiryTimer = startExpiryTimer(600, expiryTimerSpan, () => {
          showFeedback(resetErrorBanner, "error", "This recovery code has expired.", "Please request a new code.");
          otpInputs.setInvalid(true);
        });

        otpInputs.clear();
        otpInputs.setInvalid(false);
        showFeedback(resetErrorBanner, "success", "Code sent!", "A new recovery code has been sent to your email.");
        resetErrorBanner.classList.remove("hidden");
      } catch (error) {
        showFeedback(resetErrorBanner, "error", error.message);
        resetErrorBanner.classList.remove("hidden");
      } finally {
        resendBtn.disabled = false;
      }
    });
  }
});
