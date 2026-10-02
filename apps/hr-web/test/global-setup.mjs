import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { createDatabaseClient } from "@attendance/database";
import {
  databaseEnv,
  requireAuth,
  assertTestDatabase,
  fixturePath,
  departmentFixturePath,
  positionFixturePath,
  employeeFixturePath,
} from "./environment.mjs";
export default async function setup() {
  assertTestDatabase(databaseEnv.TEST_DATABASE_URL);
  const db = createDatabaseClient(databaseEnv.TEST_DATABASE_URL);
  const { hash } = requireAuth("bcrypt");
  const password = "Browser-Initial-Test-123456";
  const account = (project) => ({
    project,
    id: randomUUID(),
    email: `browser-${randomUUID()}@example.invalid`,
    password,
  });
  const fixtures = ["desktop", "mobile"].map(account);
  // Department journeys start from an admin who already changed the initial password.
  const departmentFixtures = ["desktop", "mobile"].map((project) => ({
    ...account(project),
    codePrefix: `E2E${randomUUID().slice(0, 6).toUpperCase()}`,
  }));
  const positionFixtures = ["desktop", "mobile"].map((project) => ({
    ...account(project), codePrefix: `E2E${randomUUID().slice(0, 6).toUpperCase()}`,
  }));
  const employeeFixtures = [];
  for (const project of ['desktop', 'mobile']) {
    const admin = account(project); const codePrefix = 'E2E' + randomUUID().slice(0,6).toUpperCase();
    const department = await db.empDepartment.create({ data: { name: codePrefix + ' Departemen', code: codePrefix + '-D' } });
    const position = await db.empPosition.create({ data: { name: codePrefix + ' Jabatan', code: codePrefix + '-P' } });
    employeeFixtures.push({ ...admin, codePrefix, departmentId: department.id, departmentName: department.name, positionId: position.id, positionName: position.name });
  }
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, JSON.stringify(fixtures));
  writeFileSync(departmentFixturePath, JSON.stringify(departmentFixtures));
  writeFileSync(positionFixturePath, JSON.stringify(positionFixtures));
  writeFileSync(employeeFixturePath, JSON.stringify(employeeFixtures));
  try {
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: [
        ...fixtures.map(({ id, email }) => ({ id, email, passwordHash, role: "ADMIN_HRD", status: "ACTIVE", mustChangePassword: true })),
        ...[...departmentFixtures, ...positionFixtures, ...employeeFixtures].map(({ id, email }) => ({ id, email, passwordHash, role: "ADMIN_HRD", status: "ACTIVE", mustChangePassword: false })),
      ],
    });
  } finally {
    await db.$disconnect();
  }
}
