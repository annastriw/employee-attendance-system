import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config } from 'dotenv';

function upstream(name: string, fallback: string) {
  if (process.env.NODE_ENV === 'production' && !process.env[name]) {
    throw new Error(`${name} wajib pada production.`);
  }
  const url = new URL(process.env[name] ?? fallback);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(`${name} harus berupa origin HTTP/HTTPS tanpa kredensial.`);
  }
  return url.origin;
}

@Injectable()
export class GatewayConfig {
  readonly authUrl: string;
  readonly employeeUrl: string;
  readonly attendanceUrl: string;
  readonly origins: string[];
  readonly port: number;
  readonly timeoutMs = 5000;
  constructor() {
    if (process.env.NODE_ENV !== 'production') {
      let root = resolve(process.cwd());
      while (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
        const parent = dirname(root);
        if (parent === root) throw new Error('Workspace tidak ditemukan.');
        root = parent;
      }
      config({ path: join(root, '.env.gateway'), quiet: true });
    }
    this.authUrl = upstream('AUTH_SERVICE_URL', 'http://127.0.0.1:3001');
    this.employeeUrl = upstream('EMPLOYEE_SERVICE_URL', 'http://127.0.0.1:3002');
    this.attendanceUrl = upstream('ATTENDANCE_SERVICE_URL', 'http://127.0.0.1:3003');
    this.origins = (
      process.env.GATEWAY_ALLOWED_ORIGINS ??
      (process.env.NODE_ENV === 'production'
        ? ''
        : 'http://localhost:5173,http://localhost:5174')
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !this.origins.length ||
      this.origins.some((value) => {
        try {
          const origin = new URL(value);
          return (
            origin.origin !== value ||
            (origin.protocol !== 'https:' &&
              !(
                origin.protocol === 'http:' &&
                ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
              ))
          );
        } catch {
          return true;
        }
      })
    )
      throw new Error(
        'GATEWAY_ALLOWED_ORIGINS harus berisi origin HTTPS atau HTTP localhost.',
      );
    this.port = Number(process.env.PORT ?? 3000);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
      throw new Error('PORT tidak valid.');
  }
}
