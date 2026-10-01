import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.database", quiet: true });

const databaseUrl = env("TEST_DATABASE_URL");
const url = new URL(databaseUrl);
if (url.hostname !== "127.0.0.1" || url.port !== "3307" || url.pathname !== "/attendance_test") {
  throw new Error("Test migrations must target the isolated local attendance_test database.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl },
});
