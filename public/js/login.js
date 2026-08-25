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
