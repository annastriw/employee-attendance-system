import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
function origin(
  value: string | undefined,
  fallback: string,
  production: boolean,
) {
  if (production && !value)
    throw new Error('Service origin is required in production.');
  const url = new URL(value ?? fallback);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
  )
    throw new Error('Service requires HTTPS or a loopback HTTP origin.');
  return url.origin;
}
@Injectable()
export class AttendanceConfig {
  readonly databaseUrl: string;
  readonly caCertificate?: string;
  readonly authUrl: string;
  readonly employeeUrl: string;
  readonly mediaUrl: string;
  readonly port: number;
  readonly timeoutMs = 5000;
  readonly internalSecret: string;
  readonly mediaSecret: string;
  readonly workerEnabled: boolean;
  readonly production = process.env.NODE_ENV === 'production';
  constructor() {
    if (!this.production) {
      let root = process.cwd();
      while (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
        const parent = dirname(root);
        if (parent === root)
          throw new Error('Cannot find workspace configuration.');
        root = parent;
      }
      for (const name of ['.env.database', '.env.attendance'])
        config({ path: join(root, name), quiet: true });
    }
    const test = process.env.NODE_ENV === 'test';
    this.databaseUrl =
      process.env[
        test ? 'ATTENDANCE_TEST_DATABASE_URL' : 'ATTENDANCE_DATABASE_URL'
      ] ?? '';
    const db = new URL(this.databaseUrl);
    if (
      db.protocol !== 'mysql:' ||
      !db.username ||
      decodeURIComponent(db.username) === 'root' ||
      db.username.includes('migrator')
    )
      throw new Error(
        'Attendance requires its restricted MySQL runtime account.',
      );
    if (
      test &&
      (db.hostname !== '127.0.0.1' ||
        db.port !== '3307' ||
        db.pathname !== '/attendance_test')
    )
      throw new Error(
        'Attendance requires the isolated loopback test database.',
      );
    if (process.env.ATTENDANCE_DATABASE_CA_FILE)
      this.caCertificate = readFileSync(
        process.env.ATTENDANCE_DATABASE_CA_FILE,
        'utf8',
      );
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) &&
      !this.caCertificate
    )
      throw new Error('Remote MySQL requires a verified CA.');
    this.internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? '';
    this.mediaSecret = process.env.MEDIA_INTERNAL_SECRET ?? '';
    if (
      ![this.internalSecret, this.mediaSecret].every((s) =>
        /^[a-f0-9]{64}$/.test(s),
      )
    )
      throw new Error(
        'Configure Attendance internal service secrets (32 random bytes hex).',
      );
    this.authUrl = origin(
      process.env.AUTH_SERVICE_URL,
      'http://127.0.0.1:3001',
      this.production,
    );
    this.employeeUrl = origin(
      process.env.EMPLOYEE_SERVICE_URL,
      'http://127.0.0.1:3002',
      this.production,
    );
    this.mediaUrl = origin(
      process.env.MEDIA_SERVICE_URL,
      'http://127.0.0.1:3004',
      this.production,
    );
    this.workerEnabled =
      !test && process.env.ATTENDANCE_OUTBOX_ENABLED !== 'false';
    this.port = Number(process.env.PORT ?? 3003);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
      throw new Error('Invalid Attendance port.');
  }
}
