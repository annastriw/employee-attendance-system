import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

export function httpOrigin(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      'Media endpoint configuration is required and must be a valid origin.',
    );
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
  ) {
    throw new Error('Media endpoints require HTTPS or loopback HTTP origins.');
  }
  return url;
}

@Injectable()
export class MediaConfig {
  readonly databaseUrl: string;
  readonly caCertificate?: string;
  readonly authUrl: string;
  readonly endpoint: URL;
  readonly publicEndpoint: URL;
  readonly bucket: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly internalSecret: string;
  readonly port: number;
  readonly timeoutMs: number = 5000;

  constructor() {
    if (process.env.NODE_ENV !== 'production') {
      let root = process.cwd();
      while (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
        const parent = dirname(root);
        if (parent === root)
          throw new Error('Workspace configuration not found.');
        root = parent;
      }
      for (const name of ['.env.database', '.env.media'])
        config({ path: join(root, name), quiet: true });
    }
    const test = process.env.NODE_ENV === 'test';
    this.databaseUrl =
      process.env[test ? 'MEDIA_TEST_DATABASE_URL' : 'MEDIA_DATABASE_URL'] ??
      '';
    let db: URL;
    try {
      db = new URL(this.databaseUrl);
    } catch {
      throw new Error('Media MySQL configuration is required.');
    }
    if (
      db.protocol !== 'mysql:' ||
      !db.username ||
      db.username === 'root' ||
      db.username.includes('migrator')
    ) {
      throw new Error('Media runtime must use a restricted MySQL account.');
    }
    if (
      test &&
      (db.hostname !== '127.0.0.1' ||
        db.port !== '3307' ||
        db.pathname !== '/attendance_test')
    ) {
      throw new Error('Media tests must use the isolated local test database.');
    }
    if (process.env.MEDIA_DATABASE_CA_FILE)
      this.caCertificate = readFileSync(
        process.env.MEDIA_DATABASE_CA_FILE,
        'utf8',
      );
    this.authUrl = httpOrigin(
      process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001',
    ).origin;
    this.endpoint = httpOrigin(process.env.MEDIA_S3_ENDPOINT ?? '');
    this.publicEndpoint = httpOrigin(
      process.env.MEDIA_S3_PUBLIC_ENDPOINT ?? '',
    );
    if (
      test &&
      [this.endpoint, this.publicEndpoint].some(
        (url) =>
          !['localhost', '127.0.0.1'].includes(url.hostname) ||
          url.protocol !== 'http:' ||
          url.port !== '9000',
      )
    ) {
      throw new Error(
        'Test storage must target the isolated local bucket on AIStor port 9000.',
      );
    }
    this.bucket =
      process.env[test ? 'MEDIA_S3_TEST_BUCKET' : 'MEDIA_S3_BUCKET'] ?? '';
    this.accessKey =
      process.env[test ? 'MEDIA_S3_TEST_ACCESS_KEY' : 'MEDIA_S3_ACCESS_KEY'] ??
      '';
    this.secretKey =
      process.env[test ? 'MEDIA_S3_TEST_SECRET_KEY' : 'MEDIA_S3_SECRET_KEY'] ??
      '';
    this.internalSecret = process.env.MEDIA_INTERNAL_SECRET ?? '';
    if (
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(this.bucket) ||
      !this.accessKey ||
      this.secretKey.length < 32 ||
      !/^[a-f0-9]{64}$/.test(this.internalSecret)
    )
      throw new Error(
        'Media storage credentials, bucket and internal secret are required.',
      );
    if (test && this.bucket !== 'attendance-photos-test')
      throw new Error('Test storage must use attendance-photos-test.');
    this.port = Number(process.env.PORT ?? 3004);
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
      throw new Error('Invalid Media port.');
  }
}
