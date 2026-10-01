import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  testMatch: "portal-design.spec.ts",
  workers: 1,
  use: {
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm run dev --host 127.0.0.1 --port 15175 --strictPort",
      url: "http://127.0.0.1:15175",
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: "http://127.0.0.1:15175/api/v1" },
    },
    {
      command: "pnpm --dir ../attendance-web run dev --host 127.0.0.1 --port 15173 --strictPort",
      url: "http://127.0.0.1:15173",
      reuseExistingServer: false,
    },
  ],
});
