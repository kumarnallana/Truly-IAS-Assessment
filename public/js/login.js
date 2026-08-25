// Basic state toggler for Login UI screens (Part 2 implementation pending)

window.showScreen = showScreen;
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.setAttribute("data-active", "false");
  });
  const activeScreen = document.querySelector(`[data-testid="${screenId}"]`);
  if (activeScreen) {
    activeScreen.setAttribute("data-active", "true");
  }
}

// Just wire up a dummy button to test screen transitions
const continueBtn = document.querySelector('[data-testid="login-mfa-choice-continue-btn"]');
if (continueBtn) {
  continueBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("login-otp-screen");
  });
}

const loginBtn = document.querySelector('[data-testid="login-submit-btn"]');
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("login-mfa-choice-screen");
  });
}

// Custom Keypad Logic for OTP
const otpInputs = Array.from(document.querySelectorAll('.otp-input__box'));
const keypadBtns = document.querySelectorAll('.mobile-keypad__btn');

function getNextEmptyOtpIndex() {
  return otpInputs.findIndex(input => !input.value);
}

function focusNextEmpty() {
  const nextIdx = getNextEmptyOtpIndex();
  if (nextIdx !== -1) {
    otpInputs[nextIdx].focus();
  } else if (otpInputs.length > 0) {
    otpInputs[otpInputs.length - 1].focus();
  }
}

keypadBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Prevent default to avoid shifting focus away from inputs if needed
    e.preventDefault();
    
    const key = btn.getAttribute('data-key');
    if (key === 'blank') return;
    
    if (key === 'backspace') {
      // Find the last filled input and clear it
      for (let i = otpInputs.length - 1; i >= 0; i--) {
        if (otpInputs[i].value) {
          otpInputs[i].value = '';
          otpInputs[i].focus();
          return;
        }
      }
    } else {
      // It's a number
      const nextIdx = getNextEmptyOtpIndex();
      if (nextIdx !== -1) {
        otpInputs[nextIdx].value = key;
        if (nextIdx + 1 < otpInputs.length) {
          otpInputs[nextIdx + 1].focus();
        }
      }
    }
  });
});

