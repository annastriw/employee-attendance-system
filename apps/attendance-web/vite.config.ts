import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import { rewriteRequestCookies, rewriteResponseCookie } from "../../scripts/dev-proxy-cookies.mjs";
const VPS_API = "https://attendance-api.annastriwidagdo.me";
const PROD_ORIGIN = "https://attendance.annastriwidagdo.me";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: VPS_API,
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            const cookie = proxyReq.getHeader("cookie");
            if (typeof cookie === "string") {
              proxyReq.setHeader("cookie", rewriteRequestCookies(cookie)!);
            }
            proxyReq.setHeader("origin", PROD_ORIGIN);
            proxyReq.setHeader("referer", PROD_ORIGIN + "/");
          });
          proxy.on("proxyRes", (proxyRes) => {
            const cookies = proxyRes.headers["set-cookie"];
            if (Array.isArray(cookies)) {
              proxyRes.headers["set-cookie"] = cookies.map(rewriteResponseCookie);
            }
          });
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/legacy/**/*.test.tsx"],
    css: false,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
