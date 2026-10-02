import { readFileSync, appendFileSync, existsSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
process.chdir(fileURLToPath(new URL('../../', import.meta.url)));
if (!existsSync('.env.auth')) throw new Error('Create ignored Auth configuration first.');
if (!existsSync('.env.employee')) copyFileSync('.env.employee.example', '.env.employee');
const auth = parse(readFileSync('.env.auth'));
const employee = parse(readFileSync('.env.employee'));
if (auth.PROVISIONING_SERVICE_SECRET && employee.PROVISIONING_SERVICE_SECRET && auth.PROVISIONING_SERVICE_SECRET !== employee.PROVISIONING_SERVICE_SECRET) throw new Error('Existing provisioning keys disagree; restore matching configuration.');
const shared = auth.PROVISIONING_SERVICE_SECRET || employee.PROVISIONING_SERVICE_SECRET || randomBytes(32).toString('hex');
if (!/^[a-f0-9]{64}$/.test(shared)) throw new Error('Provisioning service secret must be 32 random bytes encoded as hex.');
if (auth.PROVISIONING_CREDENTIAL_KEY && (!/^[a-f0-9]{64}$/.test(auth.PROVISIONING_CREDENTIAL_KEY) || auth.PROVISIONING_CREDENTIAL_KEY === shared)) throw new Error('Existing credential key must be valid and separate from the service key.');
function add(file, key, value) { appendFileSync(file, (readFileSync(file, 'utf8').endsWith('\n') ? '' : '\n') + key + '=' + value + '\n'); }
if (!auth.PROVISIONING_SERVICE_SECRET) add('.env.auth', 'PROVISIONING_SERVICE_SECRET', shared);
if (!employee.PROVISIONING_SERVICE_SECRET) add('.env.employee', 'PROVISIONING_SERVICE_SECRET', shared);
if (!auth.PROVISIONING_CREDENTIAL_KEY) add('.env.auth', 'PROVISIONING_CREDENTIAL_KEY', randomBytes(32).toString('hex'));
console.log('Provisioning keys configured in ignored local files; existing keys preserved.');
