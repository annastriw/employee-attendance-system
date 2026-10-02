import { readFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config.ts";

const cert = process.env.CAPTURE_HTTPS_CERT;
const key = process.env.CAPTURE_HTTPS_KEY;
if (!cert || !key) throw new Error("Set CAPTURE_HTTPS_CERT dan CAPTURE_HTTPS_KEY ke sertifikat development yang dipercaya perangkat.");
export default mergeConfig(base, defineConfig({
  server: { https: { cert: readFileSync(cert), key: readFileSync(key) } },
}));
