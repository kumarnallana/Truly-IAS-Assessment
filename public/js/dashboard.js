import { apiRequest } from "./api.js";

let accessToken = null;

const result = document.querySelector('[data-testid="dashboard-result"]');
const issueButton = document.querySelector('[data-testid="issue-token-btn"]');
const protectedButton = document.querySelector('[data-testid="call-protected-btn"]');
const logoutButton = document.querySelector('[data-testid="logout-btn"]');

function renderResult(message) {
  result.textContent = message;
}

async function loadProfile() {
  try {
    const response = await apiRequest("/me", { method: "GET", csrf: false });
    document.querySelector('[data-testid="dashboard-name"]').textContent = response.user.name;
    document.querySelector('[data-testid="dashboard-email"]').textContent = response.user.email;
    document.querySelector('[data-testid="dashboard-mfa"]').textContent = response.user.mfaEnabled ? "Enabled" : "Not enabled";
  } catch {
    window.location.replace("/login.html");
  }
}

issueButton.addEventListener("click", async () => {
  issueButton.disabled = true;
  renderResult("Issuing token from your authenticated session…");
  try {
    const response = await apiRequest("/token", { method: "POST" });
    accessToken = response.accessToken;
    protectedButton.disabled = false;
    renderResult(`Token issued in memory only. Type: ${response.tokenType}. Expires in ${response.expiresIn} seconds.`);
  } catch (error) {
    renderResult(error.message);
  } finally {
    issueButton.disabled = false;
  }
});

protectedButton.addEventListener("click", async () => {
  if (!accessToken) return;
  protectedButton.disabled = true;
  try {
    const response = await apiRequest("/protected", {
      method: "GET",
      csrf: false,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    renderResult(`${response.message}\nAudience: ${response.token.audience}\nExpires: ${response.token.expiresAt}`);
  } catch (error) {
    accessToken = null;
    renderResult(error.message);
  } finally {
    protectedButton.disabled = !accessToken;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await apiRequest("/logout", { method: "POST" });
  } finally {
    accessToken = null;
    window.location.replace("/login.html");
  }
});

loadProfile();

