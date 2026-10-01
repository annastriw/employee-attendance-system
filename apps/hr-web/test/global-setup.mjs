import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { createDatabaseClient } from "@attendance/database";
import {
  databaseEnv,
  requireAuth,
  assertTestDatabase,
  fixturePath,
} from "./environment.mjs";
export default async function setup() {
  assertTestDatabase(databaseEnv.TEST_DATABASE_URL);
  const db = createDatabaseClient(databaseEnv.TEST_DATABASE_URL);
  const { hash } = requireAuth("bcrypt");
  const password = "Browser-Initial-Test-123456";
  const fixtures = ["desktop", "mobile"].map((project) => ({
    project,
    id: randomUUID(),
    email: `browser-${randomUUID()}@example.invalid`,
    password,
  }));
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, JSON.stringify(fixtures));
  try {
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: fixtures.map(({ id, email }) => ({
        id,
        email,
        passwordHash,
        role: "ADMIN_HRD",
        status: "ACTIVE",
        mustChangePassword: true,
      })),
    });
  } finally {
    await db.$disconnect();
  }
}
