import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createDatabaseClient } from "@attendance/database";
import {
  databaseEnv,
  assertTestDatabase,
  fixturePath,
  departmentFixturePath,
  positionFixturePath,
} from "./environment.mjs";
const read = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : []);
export default async function teardown() {
  const fixtures = read(fixturePath);
  const departmentFixtures = read(departmentFixturePath);
  const positionFixtures = read(positionFixturePath);
  const ids = [...fixtures, ...departmentFixtures, ...positionFixtures].map((fixture) => fixture.id);
  if (!ids.length) return;
  assertTestDatabase(databaseEnv.TEST_DATABASE_URL);
  if (ids.some((id) => !/^[0-9a-f-]{36}$/.test(id)))
    throw new Error("Invalid test fixture IDs.");
  const prefixes = departmentFixtures.map((fixture) => fixture.codePrefix);
  const positionPrefixes = positionFixtures.map((fixture) => fixture.codePrefix);
  if ([...prefixes, ...positionPrefixes].some((prefix) => !/^E2E[0-9A-F]{6}$/.test(prefix)))
    throw new Error("Invalid test department prefix.");
  const db = createDatabaseClient(databaseEnv.TEST_DATABASE_URL);
  try {
    await db.$transaction(async (tx) => {
      await tx.empAuditLog.deleteMany({ where: { actorAccountId: { in: ids } } });
      for (const prefix of prefixes)
        await tx.empDepartment.deleteMany({ where: { code: { startsWith: prefix } } });
      for (const prefix of positionPrefixes)
        await tx.empPosition.deleteMany({ where: { code: { startsWith: prefix } } });
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
    for (const path of [fixturePath, departmentFixturePath, positionFixturePath]) if (existsSync(path)) unlinkSync(path);
  } finally {
    await db.$disconnect();
  }
}
