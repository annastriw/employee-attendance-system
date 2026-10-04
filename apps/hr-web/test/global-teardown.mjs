import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createDatabaseClient } from "@attendance/database";
import {
  databaseEnv,
  assertTestDatabase,
  fixturePath,
  departmentFixturePath,
  positionFixturePath,
  employeeFixturePath,
} from "./environment.mjs";
const read = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : []);
export default async function teardown() {
  const fixtures = read(fixturePath);
  const departmentFixtures = read(departmentFixturePath);
  const positionFixtures = read(positionFixturePath);
  const employeeFixtures = read(employeeFixturePath);
  const ids = [...fixtures, ...departmentFixtures, ...positionFixtures, ...employeeFixtures].map((fixture) => fixture.id);
  if (!ids.length) return;
  assertTestDatabase(databaseEnv.TEST_DATABASE_URL);
  if (ids.some((id) => !/^[0-9a-f-]{36}$/.test(id)))
    throw new Error("Invalid test fixture IDs.");
  const prefixes = [...departmentFixtures, ...employeeFixtures].map((fixture) => fixture.codePrefix);
  const positionPrefixes = [...positionFixtures, ...employeeFixtures].map((fixture) => fixture.codePrefix);
  if ([...prefixes, ...positionPrefixes].some((prefix) => !/^E2E[0-9A-F]{6}$/.test(prefix)))
    throw new Error("Invalid test department prefix.");
  const db = createDatabaseClient(databaseEnv.TEST_DATABASE_URL);
  try {
    const operations = await db.empProvisioning.findMany({ where: { actorAccountId: { in: ids } } });
    const employeeIds = operations.map(row => row.employeeId);
    const employeeAccounts = await db.authAccount.findMany({ where: { employeeId: { in: employeeIds } } });
    const allAccountIds = [...ids, ...employeeAccounts.map(row => row.id)];
    await db.$transaction(async (tx) => {
      await tx.authProvisioning.deleteMany({ where: { accountId: { in: allAccountIds } } });
      await tx.empProvisioning.deleteMany({ where: { actorAccountId: { in: ids } } });
      await tx.empEmployee.deleteMany({ where: { id: { in: employeeIds } } });
      await tx.empAuditLog.deleteMany({ where: { actorAccountId: { in: ids } } });
      for (const prefix of prefixes)
        await tx.empDepartment.deleteMany({ where: { code: { startsWith: prefix } } });
      for (const prefix of positionPrefixes)
        await tx.empPosition.deleteMany({ where: { code: { startsWith: prefix } } });
      await tx.authSession.deleteMany({ where: { accountId: { in: allAccountIds } } });
      await tx.authAuditLog.deleteMany({
        where: {
          OR: [
            { actorAccountId: { in: allAccountIds } },
            { targetAccountId: { in: allAccountIds } },
          ],
        },
      });
      await tx.authAccount.deleteMany({
        where: { id: { in: allAccountIds }, email: { endsWith: "@example.invalid" } },
      });
    });
    for (const path of [fixturePath, departmentFixturePath, positionFixturePath, employeeFixturePath]) if (existsSync(path)) unlinkSync(path);
  } finally {
    await db.$disconnect();
  }
}
