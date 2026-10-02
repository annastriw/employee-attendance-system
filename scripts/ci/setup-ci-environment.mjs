import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parse } from 'dotenv';
import { createDatabaseClient } from '../../packages/database/dist/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);

const mediaRequire = createRequire(resolve(root, 'apps/media-service/package.json'));
const { Client: MinioClient } = mediaRequire('minio');

const isGrants = process.argv.includes('--grants');
const isForce = process.argv.includes('--force') || Boolean(process.env.CI);

// Safe predetermined or random hex credentials for CI
const migratorPass = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const authPass = '1123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const authTestPass = '2123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mediaPass = '3123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mediaTestPass = '4123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const employeePass = '5123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const employeeTestPass = '6123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const attendancePass = '7123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const attendanceTestPass = '8123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mediaS3Secret = '9123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mediaS3TestSecret = 'a123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mediaInternalSecret = 'b123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const jwtSecret = 'c123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function main() {
  const mysqlRootPassword = process.env.MYSQL_ROOT_PASSWORD ||
    (existsSync('.env.mysql') ? parse(readFileSync('.env.mysql')).MYSQL_ROOT_PASSWORD : '') ||
    'ci_root_password';

  if (!isGrants) {
    console.log('[CI] Initializing environment files...');
    if (isForce || !existsSync('.env.mysql')) {
      writeFileSync('.env.mysql', `MYSQL_ROOT_PASSWORD=${mysqlRootPassword}\nMYSQL_DATABASE=attendance_dev\n`);
    }

    if (isForce || !existsSync('.env.database')) {
      writeFileSync('.env.database', [
        `DATABASE_URL=mysql://attendance_migrator:${migratorPass}@127.0.0.1:3307/attendance_dev`,
        `SHADOW_DATABASE_URL=mysql://attendance_migrator:${migratorPass}@127.0.0.1:3307/attendance_shadow`,
        `TEST_DATABASE_URL=mysql://attendance_migrator:${migratorPass}@127.0.0.1:3307/attendance_test`,
        `AUTH_DATABASE_URL=mysql://attendance_auth:${authPass}@127.0.0.1:3307/attendance_dev`,
        `AUTH_TEST_DATABASE_URL=mysql://attendance_auth_test:${authTestPass}@127.0.0.1:3307/attendance_test`,
        `MEDIA_DATABASE_URL=mysql://attendance_media:${mediaPass}@127.0.0.1:3307/attendance_dev`,
        `MEDIA_TEST_DATABASE_URL=mysql://attendance_media_test:${mediaTestPass}@127.0.0.1:3307/attendance_test`,
        `EMPLOYEE_DATABASE_URL=mysql://attendance_employee:${employeePass}@127.0.0.1:3307/attendance_dev`,
        `EMPLOYEE_TEST_DATABASE_URL=mysql://attendance_employee_test:${employeeTestPass}@127.0.0.1:3307/attendance_test`,
        `ATTENDANCE_DATABASE_URL=mysql://attendance_attendance:${attendancePass}@127.0.0.1:3307/attendance_dev`,
        `ATTENDANCE_TEST_DATABASE_URL=mysql://attendance_attendance_test:${attendanceTestPass}@127.0.0.1:3307/attendance_test`,
        '',
      ].join('\n'), { mode: 0o600 });
    }

    if (isForce || !existsSync('.env.auth')) {
      writeFileSync('.env.auth', [
        `PORT=3001`,
        `AUTH_JWT_SECRET=${jwtSecret}`,
        `AUTH_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:15173,http://127.0.0.1:15174,http://localhost:15174`,
        '',
      ].join('\n'), { mode: 0o600 });
    }

    if (isForce || !existsSync('.env.employee')) {
      writeFileSync('.env.employee', [
        `PORT=3002`,
        `AUTH_SERVICE_URL=http://127.0.0.1:3001`,
        `INTERNAL_SERVICE_SECRET=${mediaInternalSecret}`,
        `PROVISIONING_SERVICE_SECRET=${mediaInternalSecret}`,
        '',
      ].join('\n'), { mode: 0o600 });
    }

    if (isForce || !existsSync('.env.aistor')) {
      writeFileSync('.env.aistor', [
        `AISTOR_ROOT_USER=attendance-local-admin`,
        `AISTOR_ROOT_PASSWORD=${process.env.AISTOR_ROOT_PASSWORD || 'minio_ci_root_password_12345678'}`,
        '',
      ].join('\n'), { mode: 0o600 });
    }

    if (isForce || !existsSync('.env.media')) {
      writeFileSync('.env.media', [
        `PORT=3004`,
        `AUTH_SERVICE_URL=http://127.0.0.1:3001`,
        `MEDIA_S3_ENDPOINT=http://127.0.0.1:9000`,
        `MEDIA_S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000`,
        `MEDIA_S3_BUCKET=attendance-photos`,
        `MEDIA_S3_ACCESS_KEY=attendance-media-local`,
        `MEDIA_S3_SECRET_KEY=${mediaS3Secret}`,
        `MEDIA_S3_TEST_BUCKET=attendance-photos-test`,
        `MEDIA_S3_TEST_ACCESS_KEY=attendance-media-test`,
        `MEDIA_S3_TEST_SECRET_KEY=${mediaS3TestSecret}`,
        `MEDIA_INTERNAL_SECRET=${mediaInternalSecret}`,
        '',
      ].join('\n'), { mode: 0o600 });
    }

    if (isForce || !existsSync('.env.attendance')) {
      writeFileSync('.env.attendance', [
        `PORT=3003`,
        `AUTH_SERVICE_URL=http://127.0.0.1:3001`,
        `EMPLOYEE_SERVICE_URL=http://127.0.0.1:3002`,
        `MEDIA_SERVICE_URL=http://127.0.0.1:3004`,
        `INTERNAL_SERVICE_SECRET=${mediaInternalSecret}`,
        `MEDIA_INTERNAL_SECRET=${mediaInternalSecret}`,
        `ATTENDANCE_OUTBOX_ENABLED=true`,
        '',
      ].join('\n'), { mode: 0o600 });
    }
  }

  // Load configured database env
  const dbEnv = parse(readFileSync('.env.database'));
  const rootClient = createDatabaseClient(`mysql://root:${encodeURIComponent(mysqlRootPassword)}@127.0.0.1:3307/mysql`, { poolSize: 1 });

  try {
    if (!isGrants) {
      console.log('[CI] Creating databases and database users...');
      await rootClient.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`attendance_dev\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootClient.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`attendance_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootClient.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`attendance_shadow\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

      const userMap = [
        ['attendance_migrator', new URL(dbEnv.DATABASE_URL).password],
        ['attendance_auth', new URL(dbEnv.AUTH_DATABASE_URL).password],
        ['attendance_auth_test', new URL(dbEnv.AUTH_TEST_DATABASE_URL).password],
        ['attendance_media', new URL(dbEnv.MEDIA_DATABASE_URL).password],
        ['attendance_media_test', new URL(dbEnv.MEDIA_TEST_DATABASE_URL).password],
        ['attendance_employee', new URL(dbEnv.EMPLOYEE_DATABASE_URL).password],
        ['attendance_employee_test', new URL(dbEnv.EMPLOYEE_TEST_DATABASE_URL).password],
        ['attendance_attendance', new URL(dbEnv.ATTENDANCE_DATABASE_URL).password],
        ['attendance_attendance_test', new URL(dbEnv.ATTENDANCE_TEST_DATABASE_URL).password],
      ];

      for (const [user, password] of userMap) {
        await rootClient.$executeRawUnsafe(`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';`);
        await rootClient.$executeRawUnsafe(`ALTER USER '${user}'@'%' IDENTIFIED BY '${password}';`);
      }

      for (const db of ['attendance_dev', 'attendance_test', 'attendance_shadow']) {
        await rootClient.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON \`${db}\`.* TO 'attendance_migrator'@'%';`);
      }
      await rootClient.$executeRawUnsafe(`FLUSH PRIVILEGES;`);
      console.log('[CI] Databases and users created successfully.');

      // Setup MinIO buckets
      console.log('[CI] Verifying and setting up MinIO / S3 buckets...');
      const aistorEnv = parse(readFileSync('.env.aistor'));
      const minio = new MinioClient({
        endPoint: '127.0.0.1',
        port: 9000,
        useSSL: false,
        accessKey: aistorEnv.AISTOR_ROOT_USER,
        secretKey: aistorEnv.AISTOR_ROOT_PASSWORD,
      });

      for (const bucket of ['attendance-photos', 'attendance-photos-test']) {
        const exists = await minio.bucketExists(bucket).catch(() => false);
        if (!exists) {
          await minio.makeBucket(bucket, 'us-east-1');
          console.log(`[CI] Created MinIO bucket: ${bucket}`);
        } else {
          console.log(`[CI] MinIO bucket already exists: ${bucket}`);
        }
      }

      // Configure MinIO users if mc is available
      const mcPath = existsSync('/tmp/mc') ? '/tmp/mc' : (spawnSync('which', ['mc']).status === 0 ? 'mc' : null);
      if (mcPath) {
        console.log(`[CI] Setting up MinIO users and policies via ${mcPath}...`);
        const mediaEnv = parse(readFileSync('.env.media'));
        spawnSync(mcPath, ['alias', 'set', 'local', 'http://127.0.0.1:9000', aistorEnv.AISTOR_ROOT_USER, aistorEnv.AISTOR_ROOT_PASSWORD], { stdio: 'ignore' });
        
        const storageUsers = [
          [mediaEnv.MEDIA_S3_ACCESS_KEY, mediaEnv.MEDIA_S3_SECRET_KEY, mediaEnv.MEDIA_S3_BUCKET],
          [mediaEnv.MEDIA_S3_TEST_ACCESS_KEY, mediaEnv.MEDIA_S3_TEST_SECRET_KEY, mediaEnv.MEDIA_S3_TEST_BUCKET],
        ];

        for (const [user, secret, bucket] of storageUsers) {
          spawnSync(mcPath, ['admin', 'user', 'add', 'local', user, secret], { stdio: 'ignore' });
          const policyJson = JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              { Effect: 'Allow', Action: ['s3:GetBucketLocation', 's3:ListBucket'], Resource: [`arn:aws:s3:::${bucket}`] },
              { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: [`arn:aws:s3:::${bucket}/attendance/*`] },
            ],
          });
          const policyFile = resolve(root, `.local/minio-policy-${user}.json`);
          writeFileSync(policyFile, policyJson);
          spawnSync(mcPath, ['admin', 'policy', 'create', 'local', `policy-${user}`, policyFile], { stdio: 'ignore' });
          spawnSync(mcPath, ['admin', 'policy', 'attach', 'local', `policy-${user}`, '--user', user], { stdio: 'ignore' });
        }
        console.log('[CI] MinIO storage users configured.');
      }
    } else {
      console.log('[CI] Applying table-level grants on attendance_dev and attendance_test...');
      const grants = [
        // Auth
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`auth_accounts\` TO 'attendance_auth'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`auth_sessions\` TO 'attendance_auth'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`auth_provisioning\` TO 'attendance_auth'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`auth_email_changes\` TO 'attendance_auth'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`auth_password_resets\` TO 'attendance_auth'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_dev\`.\`auth_audit_logs\` TO 'attendance_auth'@'%';`,

        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`auth_accounts\` TO 'attendance_auth_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`auth_sessions\` TO 'attendance_auth_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`auth_provisioning\` TO 'attendance_auth_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`auth_email_changes\` TO 'attendance_auth_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`auth_password_resets\` TO 'attendance_auth_test'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_test\`.\`auth_audit_logs\` TO 'attendance_auth_test'@'%';`,

        // Employee
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_departments\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_positions\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_employees\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_provisioning\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_email_changes\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`emp_lifecycle_changes\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_dev\`.\`emp_audit_logs\` TO 'attendance_employee'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_dev\`.\`emp_employee_history\` TO 'attendance_employee'@'%';`,

        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_departments\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_positions\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_employees\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_provisioning\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_email_changes\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`emp_lifecycle_changes\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_test\`.\`emp_audit_logs\` TO 'attendance_employee_test'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_test\`.\`emp_employee_history\` TO 'attendance_employee_test'@'%';`,

        // Media
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`media_objects\` TO 'attendance_media'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_dev\`.\`media_audit_logs\` TO 'attendance_media'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`media_objects\` TO 'attendance_media_test'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_test\`.\`media_audit_logs\` TO 'attendance_media_test'@'%';`,

        // Attendance
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`att_work_policies\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`att_daily_records\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`att_events\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`att_idempotency_requests\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_dev\`.\`att_outbox\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON \`attendance_dev\`.\`att_holidays\` TO 'attendance_attendance'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_dev\`.\`att_audit_logs\` TO 'attendance_attendance'@'%';`,

        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`att_work_policies\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`att_daily_records\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`att_events\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`att_idempotency_requests\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE ON \`attendance_test\`.\`att_outbox\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON \`attendance_test\`.\`att_holidays\` TO 'attendance_attendance_test'@'%';`,
        `GRANT SELECT, INSERT ON \`attendance_test\`.\`att_audit_logs\` TO 'attendance_attendance_test'@'%';`,
      ];

      for (const sql of grants) {
        await rootClient.$executeRawUnsafe(sql);
      }
      await rootClient.$executeRawUnsafe(`FLUSH PRIVILEGES;`);
      console.log('[CI] Table grants applied successfully.');
    }
  } finally {
    await rootClient.$disconnect();
  }
}

main().catch((err) => {
  console.error('[CI] Setup failed:', err);
  process.exit(1);
});
