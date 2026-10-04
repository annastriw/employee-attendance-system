import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rewriteRequestCookies, rewriteResponseCookie } from "../../scripts/dev-proxy-cookies.mjs";

const VPS_API = "https://attendance-api.annastriwidagdo.me";
const PROD_ORIGIN = "https://hr.annastriwidagdo.me";

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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/leaflet")) return "leaflet";
          if (id.includes("node_modules/@heroui")) return "heroui";
          if (id.includes("node_modules/@phosphor-icons")) return "phosphor";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
