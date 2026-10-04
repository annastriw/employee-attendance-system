import { defineConfig, env } from "prisma/config";

// The container mounts the selected release's prisma directory read-only.
export default defineConfig({
  schema: "../prisma/schema.prisma",
  migrations: { path: "../prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
