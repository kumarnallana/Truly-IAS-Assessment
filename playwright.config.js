import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4000",
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  webServer: {
    command: "node server/server.js",
    url: "http://localhost:4000",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: "Mobile",
      use: { 
        ...devices["iPhone 13"],
        viewport: { width: 375, height: 667 } 
      },
    },
    {
      name: "Desktop",
      use: { 
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 }
      },
    },
    // The broader responsive matrix as requested by the user:
    {
      name: "Responsive-320",
      use: { viewport: { width: 320, height: 568 } },
    },
    {
      name: "Responsive-390",
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: "Responsive-430",
      use: { viewport: { width: 430, height: 932 } },
    },
    {
      name: "Responsive-768",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "Responsive-820",
      use: { viewport: { width: 820, height: 1180 } },
    },
    {
      name: "Responsive-1024",
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: "Responsive-1280",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "Responsive-1920",
      use: { viewport: { width: 1920, height: 1080 } },
    }
  ],
});
