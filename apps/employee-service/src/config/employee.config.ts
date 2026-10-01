import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

@Injectable()
export class EmployeeConfig {
  readonly databaseUrl: string;
  readonly caCertificate?: string;
  /** Auth Service origin used to verify bearer sessions (revocation-aware). */
  readonly authUrl: string;
  readonly port: number;
  readonly timeoutMs = 5000;
  readonly provisioningSecret: string;
  readonly workerEnabled = process.env.NODE_ENV !== 'test' && process.env.PROVISIONING_WORKER_ENABLED !== 'false';
  readonly production = process.env.NODE_ENV === 'production';
  constructor() {
    if (!this.production) {
      let root = process.cwd();
      while (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
        const parent = dirname(root);
        if (parent === root) throw new Error('Cannot find workspace configuration.');
        root = parent;
      }
      config({ path: join(root, '.env.database'), quiet: true });
      config({ path: join(root, '.env.employee'), quiet: true });
    }
    this.provisioningSecret = process.env.PROVISIONING_SERVICE_SECRET ?? '';
    if (!/^[a-f0-9]{64}$/.test(this.provisioningSecret)) throw new Error('Configure provisioning service secret (32 random bytes as hex).');
    this.databaseUrl = process.env.EMPLOYEE_DATABASE_URL ?? '';
    let db: URL;
    try { db = new URL(this.databaseUrl); } catch { throw new Error('EMPLOYEE_DATABASE_URL is required.'); }
    if (decodeURIComponent(db.username) === 'root' || db.username.includes('migrator')) {
      throw new Error('Employee runtime must use its restricted database account.');
    }
    if (process.env.EMPLOYEE_DATABASE_CA_FILE) {
      this.caCertificate = readFileSync(process.env.EMPLOYEE_DATABASE_CA_FILE, 'utf8');
    }
    if (this.production && !process.env.AUTH_SERVICE_URL) throw new Error('AUTH_SERVICE_URL is required in production.');
    const auth = new URL(process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001');
    if (!['http:', 'https:'].includes(auth.protocol) || auth.username || auth.password ||
        auth.search || auth.hash || auth.pathname !== '/') {
      throw new Error('AUTH_SERVICE_URL must be an HTTP(S) origin without credentials.');
    }
    this.authUrl = auth.origin;
    this.port = Number(process.env.PORT ?? 3002);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) throw new Error('Invalid Employee port.');
  }
}
