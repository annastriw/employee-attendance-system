import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

@Injectable()
export class AuthConfig {
  readonly databaseUrl: string;
  readonly caCertificate?: string;
  readonly jwtSecret: string;
  readonly origins: string[];
  readonly port: number;
  readonly production = process.env.NODE_ENV === 'production';
  readonly seedEmail?: string;
  readonly seedPassword?: string;
  constructor() {
    if (!this.production) {
      let root = process.cwd();
      while (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
        const parent = dirname(root);
        if (parent === root) throw new Error('Cannot find workspace configuration.');
        root = parent;
      }
      config({ path: join(root, '.env.database'), quiet: true });
      config({ path: join(root, '.env.auth'), quiet: true });
    }
    this.databaseUrl = process.env.AUTH_DATABASE_URL ?? '';
    let db: URL;
    try { db = new URL(this.databaseUrl); } catch { throw new Error('AUTH_DATABASE_URL is required.'); }
    if (decodeURIComponent(db.username) === 'root' || db.username.includes('migrator')) {
      throw new Error('Auth runtime must use its restricted database account.');
    }
    if (process.env.AUTH_DATABASE_CA_FILE) this.caCertificate = readFileSync(process.env.AUTH_DATABASE_CA_FILE, 'utf8');
    this.jwtSecret = process.env.AUTH_JWT_SECRET ?? '';
    if (Buffer.byteLength(this.jwtSecret) < 64) throw new Error('AUTH_JWT_SECRET must contain at least 64 bytes.');
    this.origins = (process.env.AUTH_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!this.origins.length || this.origins.some((origin) => {
      try {
        const url = new URL(origin);
        return url.origin !== origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
      } catch { return true; }
    })) throw new Error('Configure explicit allowed frontend origins.');
    this.port = Number(process.env.PORT ?? 3001);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) throw new Error('Invalid Auth port.');
    this.seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    this.seedPassword = process.env.ADMIN_SEED_PASSWORD;
  }
}
