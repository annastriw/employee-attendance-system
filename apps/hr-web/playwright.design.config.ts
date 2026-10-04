import { defineConfig } from "@playwright/test";
const hrServer = {
  command: "pnpm run dev --host 127.0.0.1 --port 15175 --strictPort",
  url: "http://127.0.0.1:15175",
  reuseExistingServer: false,
  timeout: 120000,
  env: { VITE_API_BASE_URL: "http://127.0.0.1:15175/api/v1" },
};
export default defineConfig({
  testDir: "./test",
  testMatch: "portal-design.spec.ts",
  workers: 1,
  use: { browserName: "chromium", channel: process.env.CI ? undefined : "chrome", trace: "retain-on-failure" },
  webServer: process.env.HR_DESIGN_ONLY === "true" ? [hrServer] : [
    hrServer,
    { command: "pnpm --dir ../attendance-web run dev --host 127.0.0.1 --port 15173 --strictPort",
      url: "http://127.0.0.1:15173", reuseExistingServer: false, timeout: 120000 },
  ],
});