import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "portal-design.spec.ts",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:15173",
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run dev --host 127.0.0.1 --port 15173 --strictPort",
    url: "http://127.0.0.1:15173",
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_API_BASE_URL: "http://127.0.0.1:15173/api/v1" },
  },
});