import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

const root = new URL("../../", import.meta.url);
process.chdir(fileURLToPath(root));
const compose = ["compose", "--env-file", ".env.mysql", "-f", "infra/compose.mysql.local.yml"];
function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    // Do not echo SQL, connection URLs, or credentials on failure.
    throw new Error("Docker/MySQL command failed. Check Docker Desktop and the MySQL container.");
  }
  return result.stdout.trim();
}
const container = docker([...compose, "ps", "-q", "mysql"]);
if (!container) throw new Error("Start the local MySQL Compose service first.");
const mysql = (sql) => docker([
  "exec", "-i", container, "sh", "-c",
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --batch --skip-column-names',
], sql);
const mysqlEnv = parse(readFileSync(".env.mysql"));
if (mysqlEnv.MYSQL_DATABASE !== "attendance_dev") {
  throw new Error("This local-only script expects MYSQL_DATABASE=attendance_dev.");
}
const envFile = ".env.database";
if (!existsSync(envFile)) {
  const count = mysql("SELECT COUNT(*) FROM mysql.user WHERE User IN ('attendance_migrator','attendance_auth','attendance_auth_test');");
  if (count !== "0") throw new Error("Database users already exist. Restore their .env.database instead of replacing credentials.");
  const migrator = randomBytes(32).toString("hex");
  const auth = randomBytes(32).toString("hex");
  const authTest = randomBytes(32).toString("hex");
  const url = (user, password, db) => `mysql://${user}:${password}@127.0.0.1:3307/${db}`;
  writeFileSync(envFile, [
    `DATABASE_URL=${url("attendance_migrator", migrator, "attendance_dev")}`,
    `SHADOW_DATABASE_URL=${url("attendance_migrator", migrator, "attendance_shadow")}`,
    `TEST_DATABASE_URL=${url("attendance_migrator", migrator, "attendance_test")}`,
    `AUTH_DATABASE_URL=${url("attendance_auth", auth, "attendance_dev")}`,
    `AUTH_TEST_DATABASE_URL=${url("attendance_auth_test", authTest, "attendance_test")}`,
    "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
}
const env = parse(readFileSync(envFile));
// Employee runtime accounts were added after the initial setup (T10). Append
// missing credentials to the existing ignored file; never replace or print them.
const employeeKeys = [
  ["EMPLOYEE_DATABASE_URL", "attendance_employee", "attendance_dev"],
  ["EMPLOYEE_TEST_DATABASE_URL", "attendance_employee_test", "attendance_test"],
];
const missing = employeeKeys.filter(([key]) => !env[key]);
if (missing.length) {
  const lines = missing.map(([key, user, db]) =>
    `${key}=mysql://${user}:${randomBytes(32).toString("hex")}@127.0.0.1:3307/${db}`);
  writeFileSync(envFile, (readFileSync(envFile, "utf8").endsWith("\n") ? "" : "\n") + lines.join("\n") + "\n", { flag: "a" });
  Object.assign(env, parse(readFileSync(envFile)));
}
const users = [
  ["DATABASE_URL", "attendance_migrator", "attendance_dev"],
  ["AUTH_DATABASE_URL", "attendance_auth", "attendance_dev"],
  ["AUTH_TEST_DATABASE_URL", "attendance_auth_test", "attendance_test"],
  ...employeeKeys,
];
for (const [key, user, database] of users) {
  const url = new URL(env[key]);
  if (url.hostname !== "127.0.0.1" || url.port !== "3307" ||
      url.username !== user || url.pathname !== "/" + database ||
      !/^[a-f0-9]{64}$/.test(url.password)) {
    throw new Error("Unexpected local database URL. Refusing to modify database users.");
  }
}
let sql = "";
for (const db of ["attendance_dev", "attendance_test", "attendance_shadow"]) {
  sql += `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
}
for (const [key, user] of users) {
  const password = new URL(env[key]).password;
  sql += `CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';\n`;
}
for (const db of ["attendance_dev", "attendance_test", "attendance_shadow"]) {
  sql += `GRANT ALL PRIVILEGES ON \`${db}\`.* TO 'attendance_migrator'@'%';\n`;
}
if (process.argv.includes("--grants")) {
  for (const [db, user] of [["attendance_dev", "attendance_auth"], ["attendance_test", "attendance_auth_test"]]) {
    for (const table of ["auth_accounts", "auth_sessions", "auth_provisioning"]) {
      sql += `GRANT SELECT, INSERT, UPDATE ON \`${db}\`.\`${table}\` TO '${user}'@'%';\n`;
    }
    sql += `GRANT SELECT, INSERT ON \`${db}\`.auth_audit_logs TO '${user}'@'%';\n`;
  }
  // Employee master data is deactivated, never hard-deleted; audit is append-only.
  for (const [db, user] of [["attendance_dev", "attendance_employee"], ["attendance_test", "attendance_employee_test"]]) {
    sql += `GRANT SELECT, INSERT, UPDATE ON \`${db}\`.emp_departments TO '${user}'@'%';\n`;
    sql += `GRANT SELECT, INSERT, UPDATE ON \`${db}\`.emp_positions TO '${user}'@'%';\n`;
    for (const table of ["emp_employees", "emp_provisioning"]) {
      sql += `GRANT SELECT, INSERT, UPDATE ON \`${db}\`.\`${table}\` TO '${user}'@'%';\n`;
    }
    sql += `GRANT SELECT, INSERT ON \`${db}\`.emp_audit_logs TO '${user}'@'%';\n`;
  }
}
mysql(sql);
console.log("Local database setup complete. Credentials are in ignored .env.database.");
console.log("Dev/test/shadow databases are isolated schemas on the same local MySQL instance.");
