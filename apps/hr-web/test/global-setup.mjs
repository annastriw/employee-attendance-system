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
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, JSON.stringify(fixtures));
  writeFileSync(departmentFixturePath, JSON.stringify(departmentFixtures));
  writeFileSync(positionFixturePath, JSON.stringify(positionFixtures));
  try {
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: [
        ...fixtures.map(({ id, email }) => ({ id, email, passwordHash, role: "ADMIN_HRD", status: "ACTIVE", mustChangePassword: true })),
        ...[...departmentFixtures, ...positionFixtures].map(({ id, email }) => ({ id, email, passwordHash, role: "ADMIN_HRD", status: "ACTIVE", mustChangePassword: false })),
      ],
    });
  } finally {
    await db.$disconnect();
  }
}
