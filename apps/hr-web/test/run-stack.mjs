import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import {
  root,
  databaseEnv,
  authEnv,
  assertTestDatabase,
} from "./environment.mjs";
assertTestDatabase(databaseEnv.AUTH_TEST_DATABASE_URL);
assertTestDatabase(databaseEnv.EMPLOYEE_TEST_DATABASE_URL);
const children = [];
function start(file, env) {
  const child = spawn(process.execPath, [file], {
    cwd: root,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && !stopping) stop(code);
  });
}
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
async function ready(url) {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error("Test stack readiness failed.");
}
try {
  const origin = "http://localhost:15174";
  start(resolve(root, "apps/auth-service/dist/main.js"), {
    PORT: "15301",
    AUTH_DATABASE_URL: databaseEnv.AUTH_TEST_DATABASE_URL,
    AUTH_JWT_SECRET: authEnv.AUTH_JWT_SECRET,
    AUTH_ALLOWED_ORIGINS: origin,
  });
  start(resolve(root, "apps/employee-service/dist/main.js"), {
    PORT: "15302",
    EMPLOYEE_DATABASE_URL: databaseEnv.EMPLOYEE_TEST_DATABASE_URL,
    AUTH_SERVICE_URL: "http://127.0.0.1:15301",
  });
  start(resolve(root, "apps/api-gateway/dist/main.js"), {
    PORT: "15300",
    AUTH_SERVICE_URL: "http://127.0.0.1:15301",
    EMPLOYEE_SERVICE_URL: "http://127.0.0.1:15302",
    GATEWAY_ALLOWED_ORIGINS: origin,
  });
  await ready("http://127.0.0.1:15300/health");
  await ready("http://127.0.0.1:15302/health");
  const requireWeb = createRequire(resolve(root, "apps/hr-web/package.json"));
  const vite = resolve(
    requireWeb.resolve("vite/package.json"),
    "../bin/vite.js",
  );
  const child = spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", "15174", "--strictPort"],
    {
      cwd: resolve(root, "apps/hr-web"),
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://localhost:15300/api/v1",
      },
      windowsHide: true,
      stdio: "inherit",
    },
  );
  children.push(child);
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
} catch {
  stop(1);
}
