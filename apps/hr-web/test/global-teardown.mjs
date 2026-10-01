import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createDatabaseClient } from "@attendance/database";
import {
  databaseEnv,
  assertTestDatabase,
  fixturePath,
} from "./environment.mjs";
export default async function teardown() {
  if (!existsSync(fixturePath)) return;
  assertTestDatabase(databaseEnv.TEST_DATABASE_URL);
  const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
  const ids = fixtures.map((fixture) => fixture.id);
  if (!ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/.test(id)))
    throw new Error("Invalid test fixture IDs.");
  const db = createDatabaseClient(databaseEnv.TEST_DATABASE_URL);
  try {
    await db.$transaction(async (tx) => {
      await tx.authSession.deleteMany({ where: { accountId: { in: ids } } });
      await tx.authAuditLog.deleteMany({
        where: {
          OR: [
            { actorAccountId: { in: ids } },
            { targetAccountId: { in: ids } },
          ],
        },
      });
      await tx.authAccount.deleteMany({
        where: { id: { in: ids }, email: { endsWith: "@example.invalid" } },
      });
    });
    unlinkSync(fixturePath);
  } finally {
    await db.$disconnect();
  }
}
