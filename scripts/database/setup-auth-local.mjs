import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../../", import.meta.url)));
if (existsSync(".env.auth")) {
  console.log("Existing .env.auth preserved.");
} else {
  writeFileSync(".env.auth", [
    "PORT=3001",
    "AUTH_JWT_SECRET=" + randomBytes(48).toString("hex"),
    "AUTH_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3001",
    "ADMIN_SEED_EMAIL=admin@example.test",
    "ADMIN_SEED_PASSWORD=" + randomBytes(24).toString("base64url"),
    "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
  console.log("Local Auth configuration generated in ignored .env.auth. No credentials printed.");
}
