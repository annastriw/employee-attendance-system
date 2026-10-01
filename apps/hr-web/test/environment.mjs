import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { parse } from "dotenv";
export const root = fileURLToPath(new URL("../../../", import.meta.url));
export const databaseEnv = parse(readFileSync(resolve(root, ".env.database")));
export const authEnv = parse(readFileSync(resolve(root, ".env.auth")));
export const requireAuth = createRequire(
  resolve(root, "apps/auth-service/package.json"),
);
export function assertTestDatabase(url) {
  const value = new URL(url);
  if (value.hostname !== "127.0.0.1" || value.pathname !== "/attendance_test")
    throw new Error(
      "Browser tests require the isolated local attendance_test schema.",
    );
}
export const fixturePath = resolve(root, ".local/hr-e2e.json");
export const departmentFixturePath = resolve(root, ".local/hr-e2e-departments.json");
