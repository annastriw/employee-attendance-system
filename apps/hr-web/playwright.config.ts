import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  testMatch: "hr-auth.spec.ts",
  workers: 1,
  fullyParallel: false,
  globalSetup: "./test/global-setup.mjs",
  globalTeardown: "./test/global-teardown.mjs",
  use: {
    baseURL: "http://localhost:15174",
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node test/run-stack.mjs",
    url: "http://localhost:15174",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
