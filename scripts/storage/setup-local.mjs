import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';

process.chdir(fileURLToPath(new URL('../../', import.meta.url)));
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('AIStor setup failed. Check the local container; credentials are never printed.');
  return result.stdout.trim();
}
const container = docker(['compose', '--env-file', '.env.aistor', '-f', 'infra/compose.aistor.local.yml', 'ps', '-q', 'aistor']);
if (!container) throw new Error('Start the local AIStor Compose service first.');
const preamble = `set -eu
tempdir=$(mktemp -d)
trap 'rm -rf "$tempdir"' EXIT
mc() { /usr/bin/mc --config-dir "$tempdir" "$@"; }
mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc admin info local >/dev/null
`;
const execute = (script) => docker(['exec', '-i', container, 'sh', '-s'], preamble + script);
const path = '.env.media';
let env = existsSync(path) ? parse(readFileSync(path)) : {};
const entries = [
  ['MEDIA_S3_SECRET_KEY', 'MEDIA_S3_ACCESS_KEY', 'attendance-media-local', 'MEDIA_S3_BUCKET', 'attendance-photos'],
  ['MEDIA_S3_TEST_SECRET_KEY', 'MEDIA_S3_TEST_ACCESS_KEY', 'attendance-media-test', 'MEDIA_S3_TEST_BUCKET', 'attendance-photos-test'],
];
for (const [secret, , user] of entries) {
  if (!env[secret] && execute(`if mc admin user info local '${user}' >/dev/null 2>&1; then echo exists; else echo missing; fi\n`) === 'exists') {
    throw new Error('Storage user already exists. Restore .env.media rather than replacing its credentials.');
  }
}
const additions = {};
for (const [secret, access, user, bucketKey, bucket] of entries) {
  additions[secret] = env[secret] ?? randomBytes(32).toString('hex');
  additions[access] = env[access] ?? user;
  additions[bucketKey] = env[bucketKey] ?? bucket;
}
for (const [key, value] of Object.entries({
  MEDIA_S3_ENDPOINT: 'http://127.0.0.1:9000',
  MEDIA_S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
  AUTH_SERVICE_URL: 'http://127.0.0.1:3001',
  MEDIA_INTERNAL_SECRET: randomBytes(32).toString('hex'),
})) additions[key] = env[key] ?? value;
const lines = Object.entries(additions).filter(([key]) => !env[key]).map(([key, value]) => key + '=' + value);
if (lines.length) writeFileSync(path, (existsSync(path) ? '\n' : '') + lines.join('\n') + '\n', { flag: existsSync(path) ? 'a' : 'wx', mode: 0o600 });
env = parse(readFileSync(path));
for (const [secret, access, user, bucketKey, bucket] of entries) {
  if (env[access] !== user || env[bucketKey] !== bucket || !/^[a-f0-9]{64}$/.test(env[secret])) {
    throw new Error('Unexpected local Media configuration. Refusing to modify storage users.');
  }
  const policy = JSON.stringify({ Version: '2012-10-17', Statement: [
    { Effect: 'Allow', Action: ['s3:GetBucketLocation', 's3:ListBucket'], Resource: ['arn:aws:s3:::' + bucket] },
    { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: ['arn:aws:s3:::' + bucket + '/attendance/*'] },
  ] });
  execute(`mc mb --ignore-existing local/${bucket} >/dev/null
mc anonymous set none local/${bucket} >/dev/null
if ! mc admin user info local '${user}' >/dev/null 2>&1; then
  mc admin user add local '${user}' '${env[secret]}' >/dev/null
fi
cat > "$tempdir/policy.json" <<'POLICY'
${policy}
POLICY
mc admin policy create local '${user}' "$tempdir/policy.json" >/dev/null
mc admin policy attach local '${user}' --user '${user}' >/dev/null
mc alias set runtime http://127.0.0.1:9000 '${user}' '${env[secret]}' >/dev/null
mc stat runtime/${bucket} >/dev/null
`);
}
console.log('AIStor private dev/test buckets and restricted Media users are ready. Credentials stay in ignored .env.media.');
