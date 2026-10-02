import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/client";
export { Prisma, PrismaClient, AuthRole, AuthAccountStatus, EmpMasterStatus, EmpEmployeeStatus, EmpProvisioningStatus, EmpProvisioningPhase } from "./generated/client";
export type { AuthAccount, AuthSession, EmpDepartment, EmpPosition, EmpAuditLog, EmpEmployee, EmpProvisioning, AuthProvisioning, EmpEmailChange, EmpLifecycleChange } from "./generated/client";

export function createDatabaseClient(databaseUrl: string, options: { caCertificate?: string; poolSize?: number } = {}) {
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw new Error("Invalid database connection configuration."); }
  if (url.protocol !== "mysql:") throw new Error("Database connection must use MySQL.");
  if (!url.username || !url.password || !url.pathname.slice(1)) {
    throw new Error("Database credentials and schema are required.");
  }
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!local && !options.caCertificate) throw new Error("Remote database connections require a verified TLS CA certificate.");
  const poolSize = options.poolSize ?? 5;
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 10) throw new Error("Invalid database pool size.");
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname, port: Number(url.port || 3306),
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      connectionLimit: poolSize, timezone: "+00:00",
      allowPublicKeyRetrieval: local && !options.caCertificate,
      ssl: options.caCertificate ? { ca: options.caCertificate, rejectUnauthorized: true } : undefined,
    }),
  });
}
