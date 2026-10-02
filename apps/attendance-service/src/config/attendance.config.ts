import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

@Injectable()
export class AttendanceConfig {
  readonly databaseUrl: string;
  readonly caCertificate?: string;
  readonly authUrl: string;
  readonly employeeUrl: string;
  readonly port: number;
  readonly timeoutMs = 5000;
  readonly internalSecret: string;
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
      config({ path: join(root, '.env.attendance'), quiet: true });
    }

    this.internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? process.env.PROVISIONING_SERVICE_SECRET ?? '00'.repeat(32);
    const dbKey = process.env.NODE_ENV === 'test' && process.env.ATTENDANCE_TEST_DATABASE_URL
      ? process.env.ATTENDANCE_TEST_DATABASE_URL
      : process.env.ATTENDANCE_DATABASE_URL;

    this.databaseUrl = dbKey ?? '';
    let db: URL;
    try {
      db = new URL(this.databaseUrl);
    } catch {
      throw new Error('ATTENDANCE_DATABASE_URL is required.');
    }
    if (decodeURIComponent(db.username) === 'root' || db.username.includes('migrator')) {
      throw new Error('Attendance runtime must use its restricted database account.');
    }

    if (process.env.ATTENDANCE_DATABASE_CA_FILE) {
      this.caCertificate = readFileSync(process.env.ATTENDANCE_DATABASE_CA_FILE, 'utf8');
    }

    const auth = new URL(process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001');
    this.authUrl = auth.origin;

    const employee = new URL(process.env.EMPLOYEE_SERVICE_URL ?? 'http://127.0.0.1:3002');
    this.employeeUrl = employee.origin;

    this.port = Number(process.env.PORT ?? 3003);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) {
      throw new Error('Invalid Attendance port.');
    }
  }
}
