import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'dotenv';
const read = path => existsSync(path) ? parse(readFileSync(path)) : {};
const employee = read('.env.employee');
const media = read('.env.media');
const current = read('.env.attendance');
const defaults = {
  PORT: '3003', AUTH_SERVICE_URL: 'http://127.0.0.1:3001',
  EMPLOYEE_SERVICE_URL: 'http://127.0.0.1:3002', MEDIA_SERVICE_URL: 'http://127.0.0.1:3004',
  INTERNAL_SERVICE_SECRET: employee.PROVISIONING_SERVICE_SECRET,
  MEDIA_INTERNAL_SECRET: media.MEDIA_INTERNAL_SECRET, ATTENDANCE_OUTBOX_ENABLED: 'true',
};
for (const key of ['INTERNAL_SERVICE_SECRET', 'MEDIA_INTERNAL_SECRET']) {
  if (!/^[a-f0-9]{64}$/.test(current[key] ?? defaults[key] ?? '')) throw new Error('Configure existing Employee/Media service secrets before attendance:setup.');
}
let content = existsSync('.env.attendance') ? readFileSync('.env.attendance', 'utf8') : '';
for (const [key, value] of Object.entries(defaults)) if (!current[key]) content += '\n' + key + '=' + value;
writeFileSync('.env.attendance', content + '\n', { mode: 0o600 });
console.log('Attendance configuration ready in ignored .env.attendance; existing values preserved.');
