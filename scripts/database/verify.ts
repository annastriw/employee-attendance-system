import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { config } from "dotenv";
import { createDatabaseClient } from "@attendance/database";


config({ path: ".env.database", quiet: true });

function client(key: string, database: string, username: string) {
  const value = process.env[key];
  assert.ok(value, "Missing database environment configuration.");
  const url = new URL(value);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "3307");
  assert.equal(url.pathname, "/" + database);
  assert.equal(url.username, username);
  return createDatabaseClient(value, { poolSize: 2 });
}

async function main() {
  const dev = client("AUTH_DATABASE_URL", "attendance_dev", "attendance_auth");
  const test = client("AUTH_TEST_DATABASE_URL", "attendance_test", "attendance_auth_test");
  try {
    const info = await dev.$queryRaw<Array<{ database_name: string; timezone: string }>>`
      SELECT DATABASE() AS database_name, @@session.time_zone AS timezone
    `;
    assert.equal(info[0].database_name, "attendance_dev");
    assert.ok(["+00:00", "UTC"].includes(info[0].timezone));
    await dev.authAccount.count();
    console.log("PASS: Prisma runtime connects to MySQL development with UTC.");

    const email = randomUUID() + "@example.invalid";
    const accountId = randomUUID();
    const rollback = new Error("rollback verification transaction");
    await assert.rejects(async () => {
      await test.$transaction(async (tx) => {
        const data = { id: accountId, email, passwordHash: "x".repeat(60), role: "EMPLOYEE" as const };
        const account = await tx.authAccount.create({ data });
        assert.equal(account.status, "INACTIVE");
        assert.equal(account.mustChangePassword, true);
        await assert.rejects(() => tx.authAccount.create({ data: { ...data, id: randomUUID() } }),
          (error: unknown) => (error as { code: string }).code === "P2002");
        // Case-insensitive uniqueness also reserves archived emails.
        await tx.authAccount.update({ where: { id: accountId }, data: { status: "ARCHIVED" } });
        await assert.rejects(() => tx.authAccount.create({ data: { ...data, id: randomUUID(), email: email.toUpperCase() } }),
          (error: unknown) => (error as { code: string }).code === "P2002");
        const session = { accountId, refreshTokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
          expiresAt: new Date(Date.now() + 60_000) };
        await tx.authSession.create({ data: session });
        await assert.rejects(() => tx.authSession.create({ data: session }),
          (error: unknown) => (error as { code: string }).code === "P2002");
        await assert.rejects(() => tx.authSession.create({ data: { ...session, accountId: randomUUID(),
          refreshTokenHash: createHash("sha256").update(randomUUID()).digest("hex") } }),
          (error: unknown) => (error as { code: string }).code === "P2003");
        await tx.authAuditLog.create({ data: { targetAccountId: accountId, action: "DATABASE_VERIFICATION" } });
        throw rollback;
      });
    }, (error: unknown) => error === rollback);
    assert.equal(await test.authAccount.count({ where: { id: accountId } }), 0);
    assert.equal(await test.authSession.count({ where: { accountId } }), 0);
    assert.equal(await test.authAuditLog.count({ where: { targetAccountId: accountId } }), 0);
    console.log("PASS: unique email/token, archived email reservation, session FK, safe defaults, transaction rollback.");

    for (const db of [dev, test]) {
      await assert.rejects(() => db.$executeRaw`CREATE TEMPORARY TABLE database_permission_probe (id INT)`, /denied/i);
      await assert.rejects(() => db.$queryRaw`SELECT id FROM _prisma_migrations LIMIT 1`, /denied/i);
      await assert.rejects(() => db.$executeRaw`DELETE FROM auth_accounts WHERE 1 = 0`, /denied/i);
      await assert.rejects(() => db.$executeRaw`UPDATE auth_audit_logs SET action = 'FORBIDDEN' WHERE 1 = 0`, /denied/i);
      await assert.rejects(() => db.$executeRaw`DELETE FROM auth_audit_logs WHERE 1 = 0`, /denied/i);
    }
    console.log("PASS: runtime cannot access migrations, delete accounts, update/delete audit.");
  } finally {
    await Promise.all([dev.$disconnect(), test.$disconnect()]);
  }
}
main().catch((error: unknown) => {
  let message = error instanceof Error ? error.message : "Database verification failed.";
  for (const key of ["DATABASE_URL", "AUTH_DATABASE_URL", "AUTH_TEST_DATABASE_URL", "TEST_DATABASE_URL", "SHADOW_DATABASE_URL"]) {
    const value = process.env[key];
    if (value) {
      message = message.replaceAll(value, "[redacted database URL]");
      const password = new URL(value).password;
      if (password) message = message.replaceAll(password, "[redacted]").replaceAll(decodeURIComponent(password), "[redacted]");
    }
  }
  console.error(message);
  process.exitCode = 1;
});
