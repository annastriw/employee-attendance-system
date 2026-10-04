import { defineConfig, env } from "prisma/config";

// The release migrator image contains the schema and migrations for its commit.
export default defineConfig({
  schema: "../prisma/schema.prisma",
  migrations: { path: "../prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
