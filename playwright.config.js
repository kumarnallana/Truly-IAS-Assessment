import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/regression",
  globalSetup: "./tests/global-setup.js",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  updateSnapshots: "none", // Prevent accidental snapshot updates without explicit --update-snapshots
  use: {
    baseURL: "http://localhost:4000",
    trace: "on-first-retry",
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    deviceScaleFactor: 1, // Fix scaling to 1 to prevent rendering drift
    contextOptions: {
      reducedMotion: 'reduce', // Freeze animations natively
    },
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled", // Disable animations inside screenshot capture
      caret: "hide",          // Hide text caret
    },
  },
  projects: [
    // DESKTOP
    { name: "Desktop-1280", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: "Desktop-1366", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1366, height: 768 } } },
    { name: "Desktop-1440", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: "Desktop-1920", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1920, height: 1080 } } },
    // TABLET
    { name: "Tablet-768", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 768, height: 1024 } } },
    { name: "Tablet-820", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 820, height: 1180 } } },
    { name: "Tablet-1023", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1023, height: 1366 } } },
    { name: "Tablet-1024", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 1024, height: 1366 } } },
    // MOBILE
    { name: "Mobile-320", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 320, height: 568 } } },
    { name: "Mobile-375", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 375, height: 667 } } },
    { name: "Mobile-390", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 390, height: 844 } } },
    { name: "Mobile-430", use: { ...devices["Desktop Chrome"], channel: 'chrome', viewport: { width: 430, height: 932 } } },
  ],
});
