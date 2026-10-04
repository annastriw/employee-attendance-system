import { createHash, randomUUID } from 'node:crypto';

const START = '2026-08-01';
const END = '2026-10-01';
const SEED_ID = 'test-company-demo-attendance-2026-08-09-v1';
const HOLIDAY_DATES = new Set(['2026-08-17', '2026-08-25']);
const WEEKDAYS = [1, 2, 3, 4, 5];
const EMPLOYEES = [
  { nik: 'DEMO001', name: 'John Doe', email: 'john.doe@testcompany.com', department: 'TC-ENG', position: 'TC-BACKEND' },
  { nik: 'DEMO002', name: 'Jane Smith', email: 'jane.smith@testcompany.com', department: 'TC-ENG', position: 'TC-FRONTEND' },
  { nik: 'DEMO003', name: 'Michael Johnson', email: 'michael.johnson@testcompany.com', department: 'TC-ENG', position: 'TC-QA' },
  { nik: 'DEMO004', name: 'Emily Davis', email: 'emily.davis@testcompany.com', department: 'TC-PROD', position: 'TC-DESIGN' },
  { nik: 'DEMO005', name: 'David Wilson', email: 'david.wilson@testcompany.com', department: 'TC-OPS', position: 'TC-OPS-STAFF' },
];
const WIB_POLICY = {
  id: 'standard-wib-default',
  name: 'Standard WIB 08:00-17:00',
  workDays: '1,2,3,4,5',
  checkInTime: '08:00:00',
  checkOutTime: '17:00:00',
  cutoffTime: '23:59:59',
  timezone: 'Asia/Jakarta',
};

export function makeWorkdays() {
  const dates = [];
  for (let value = new Date(`${START}T00:00:00.000Z`); value < new Date(`${END}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + 1)) {
    const date = value.toISOString().slice(0, 10);
    const weekday = value.getUTCDay() || 7;
    if (WEEKDAYS.includes(weekday) && !HOLIDAY_DATES.has(date)) dates.push(date);
  }
  return dates;
}

const stableUuid = (value) => {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

function utcFromWib(date, time) {
  return new Date(`${date}T${time}+07:00`);
}

export function buildPlan(employees, { includeEvents = true } = {}) {
  const workdays = makeWorkdays();
  const absent = new Set();
  employees.forEach((employee, employeeIndex) => {
    for (const month of ['2026-08', '2026-09']) {
      const monthlyDays = workdays.filter((date) => date.startsWith(month));
      const offset = month === '2026-08' ? 3 : 8;
      absent.add(`${employee.id}:${monthlyDays[(offset + employeeIndex * 3) % monthlyDays.length]}`);
    }
  });

  const records = [];
  employees.forEach((employee, employeeIndex) => {
    for (const date of workdays) {
      if (absent.has(`${employee.id}:${date}`)) continue;
      const day = Number(date.slice(-2));
      const isLate = (day + employeeIndex * 2) % 7 === 0;
      const isEarly = (day + employeeIndex * 3) % 11 === 0;
      const checkInMinute = isLate ? 5 + ((day + employeeIndex) % 25) : 45 + ((day + employeeIndex) % 16);
      const checkOutMinute = isEarly ? 30 + ((day + employeeIndex) % 26) : (day + employeeIndex) % 2 ? 5 + ((day + employeeIndex) % 26) : 0;
      const checkInTime = isLate
        ? `08:${String(checkInMinute).padStart(2, '0')}:00`
        : checkInMinute === 60 ? '08:00:00' : `07:${String(checkInMinute).padStart(2, '0')}:00`;
      const checkOutTime = isEarly
        ? `16:${String(checkOutMinute).padStart(2, '0')}:00`
        : checkOutMinute === 0 ? '17:00:00' : `17:${String(checkOutMinute).padStart(2, '0')}:00`;
      const dailyId = stableUuid(`${SEED_ID}:daily:${employee.id}:${date}`);
      const record = { employee, employeeIndex, date, dailyId, isLate, isEarly };
      if (includeEvents) {
        record.events = [
          { type: 'CHECK_IN', time: checkInTime, flag: isLate, flagField: 'isLate', purpose: 'CHECK_IN' },
          { type: 'CHECK_OUT', time: checkOutTime, flag: isEarly, flagField: 'isEarlyDeparture', purpose: 'CHECK_OUT' },
        ].map((event) => {
          const id = stableUuid(`${SEED_ID}:${event.type}:${employee.id}:${date}`);
          const bytes = employee.avatar;
          return {
            ...event,
            id,
            timeAt: utcFromWib(date, event.time),
            photoId: stableUuid(`${SEED_ID}:photo:${event.type}:${employee.id}:${date}`),
            idempotencyKey: stableUuid(`${SEED_ID}:idem:${event.type}:${employee.id}:${date}`),
            requestHash: createHash('sha256').update(`${SEED_ID}:${event.type}:${employee.id}:${date}`).digest('hex'),
            checksumSha256: bytes ? createHash('sha256').update(bytes).digest('hex') : undefined,
          };
        });
      }
      records.push(record);
    }
  });
  return { workdays, records, absences: absent.size };
}

function makeAvatarSvg(name, color) {
  const rawInitial = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const initial = rawInitial.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#27272a"/></linearGradient></defs><rect width="640" height="640" fill="url(#bg)"/><circle cx="320" cy="250" r="132" fill="#f1c7a5"/><path d="M188 247c0-113 56-174 136-174 83 0 141 64 133 170-35-42-73-64-118-67-39 35-87 55-151 58z" fill="#27211f"/><path d="M84 640c16-157 96-231 236-231s220 74 236 231" fill="#e4e4e7"/><circle cx="270" cy="258" r="9" fill="#27211f"/><circle cx="370" cy="258" r="9" fill="#27211f"/><path d="M281 319q39 27 78 0" fill="none" stroke="#8b4b42" stroke-width="9" stroke-linecap="round"/><rect x="18" y="18" width="94" height="48" rx="24" fill="#09090b" fill-opacity=".55"/><text x="65" y="51" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="white">DEMO</text><text x="320" y="590" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#18181b">${initial} · SIMULASI</text></svg>`;
}

async function mapLimit(items, limit, callback) {
  let index = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await callback(current);
    }
  }));
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
}

async function main() {
  const apply = process.argv.includes('--apply-live');
  if (apply && process.env.DEMO_SEED_TARGET !== 'attendance_prod') throw new Error('Apply live diblokir: set DEMO_SEED_TARGET=attendance_prod secara eksplisit.');
  if (!process.env.MIGRATOR_PASSWORD || !process.env.MEDIA_S3_ACCESS_KEY || !process.env.MEDIA_S3_SECRET_KEY || !process.env.MEDIA_S3_BUCKET) {
    throw new Error('Environment migrator/media storage tidak lengkap; nilai secret tidak dibaca dari argumen.');
  }

  const { createDatabaseClient } = await import('@attendance/database');
  const Minio = await import('minio');
  const sharpModule = await import('sharp');
  const Client = Minio.Client ?? Minio.default?.Client;
  const sharp = sharpModule.default ?? sharpModule;
  const databaseUrl = `mysql://attendance_migrator:${encodeURIComponent(process.env.MIGRATOR_PASSWORD)}@127.0.0.1:3307/attendance_prod`;
  const db = createDatabaseClient(databaseUrl, { poolSize: 5 });
  const addedKeys = [];

  try {
    const hr = await db.authAccount.findUnique({ where: { email: 'hr@testcompany.com' } });
    if (!hr || hr.role !== 'ADMIN_HRD' || hr.status !== 'ACTIVE' || hr.mustChangePassword) throw new Error('Akun HR aktif dan selesai mengganti password tidak ditemukan.');
    const employees = await db.empEmployee.findMany({
      where: { nik: { in: EMPLOYEES.map((item) => item.nik) } },
      include: { department: true, position: true, provisioning: true },
      orderBy: { nik: 'asc' },
    });
    if (employees.length !== EMPLOYEES.length) throw new Error('Lima profil DEMO001–DEMO005 harus tersedia sebelum impor.');
    const accounts = await db.authAccount.findMany({ where: { employeeId: { in: employees.map((item) => item.id) } } });
    const byEmployee = new Map(accounts.map((account) => [account.employeeId, account]));
    const joined = employees.map((employee) => ({ ...employee, account: byEmployee.get(employee.id) }));
    for (const employee of joined) {
      const expected = EMPLOYEES.find((item) => item.nik === employee.nik);
      if (!expected || employee.name !== expected.name || employee.account?.email !== expected.email || employee.department.code !== expected.department || employee.position.code !== expected.position || employee.startDate.toISOString().slice(0, 10) > '2026-08-03' || !employee.ready || employee.status !== 'ACTIVE' || employee.provisioning?.status !== 'COMPLETED' || employee.account?.status !== 'ACTIVE' || employee.account.mustChangePassword || !employee.account.passwordChangedAt) {
        throw new Error(`Profil/akun ${employee.nik} belum aktif atau password awal belum diganti.`);
      }
    }

    const holidays = await db.attHoliday.findMany({ where: { holidayDate: { gte: new Date(`${START}T00:00:00.000Z`), lt: new Date(`${END}T00:00:00.000Z`) } } });
    const actualHolidayDates = new Set(holidays.map((item) => item.holidayDate.toISOString().slice(0, 10)));
    if (actualHolidayDates.size !== HOLIDAY_DATES.size || [...HOLIDAY_DATES].some((date) => !actualHolidayDates.has(date))) throw new Error('Kalender periode harus tepat memuat 17 dan 25 Agustus, tanpa libur tambahan yang belum dihitung.');
    const employeeIds = employees.map((item) => item.id);
    const [existingRows, priorSeed] = await Promise.all([
      db.attDailyRecord.count({ where: { employeeId: { in: employeeIds }, attendanceDate: { gte: new Date(`${START}T00:00:00.000Z`), lt: new Date(`${END}T00:00:00.000Z`) } } }),
      db.attAuditLog.findFirst({ where: { action: 'DEMO_ATTENDANCE_SEED_APPLIED', reason: SEED_ID } }),
    ]);
    if (existingRows || priorSeed) throw new Error('Riwayat/demo seed Agustus–September sudah ada; impor dihentikan tanpa perubahan.');

    const storageUrl = new URL(process.env.MEDIA_S3_ENDPOINT ?? 'http://127.0.0.1:9000');
    const storage = new Client({
      endPoint: storageUrl.hostname,
      port: Number(storageUrl.port || (storageUrl.protocol === 'https:' ? 443 : 80)),
      useSSL: storageUrl.protocol === 'https:',
      accessKey: process.env.MEDIA_S3_ACCESS_KEY,
      secretKey: process.env.MEDIA_S3_SECRET_KEY,
      region: process.env.MEDIA_S3_REGION || 'us-east-1',
    });
    const bucket = process.env.MEDIA_S3_BUCKET;
    if (!(await storage.bucketExists(bucket))) throw new Error('Bucket media tidak tersedia.');
    const colors = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#d97706'];
    for (const employee of joined) {
      const svg = Buffer.from(makeAvatarSvg(employee.name, colors[Number(employee.nik.slice(-1)) - 1]));
      employee.avatar = await sharp(svg).jpeg({ quality: 82 }).toBuffer();
    }

    const plan = buildPlan(joined);
    const events = plan.records.flatMap((record) => record.events.map((event) => ({ record, event })));
    const activePolicy = await db.attWorkPolicy.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    const policy = activePolicy ?? WIB_POLICY;
    if (policy.workDays !== WIB_POLICY.workDays || policy.checkInTime !== WIB_POLICY.checkInTime || policy.checkOutTime !== WIB_POLICY.checkOutTime || policy.cutoffTime !== WIB_POLICY.cutoffTime || policy.timezone !== WIB_POLICY.timezone) {
      throw new Error('Kebijakan kerja aktif tidak sama dengan jadwal seed WIB 08.00–17.00; seed dihentikan.');
    }
    const summary = { workdays: plan.workdays.length, absences: plan.absences, dailyRecords: plan.records.length, events: events.length, photos: events.length };
    if (!apply) {
      console.log(`DRY RUN attendance_prod — workdays=${summary.workdays}, absences=${summary.absences}, dailyRecords=${summary.dailyRecords}, events=${summary.events}, photos=${summary.photos}. Tidak ada perubahan database/storage.`);
      return;
    }

    const images = new Map(joined.map((employee) => [employee.id, employee.avatar]));
    try {
      await mapLimit(events, 4, async ({ record, event }) => {
        const objectKey = `attendance/${record.employee.id}/${event.photoId}.jpg`;
        await storage.putObject(bucket, objectKey, images.get(record.employee.id), images.get(record.employee.id).length, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=0' });
        addedKeys.push(objectKey);
      });
    } catch (error) {
      await storage.removeObjects(bucket, addedKeys).catch(() => undefined);
      throw error;
    }

    try {
      await db.$transaction(async (tx) => {
        for (const record of plan.records) {
          const daily = await tx.attDailyRecord.create({
            data: {
              id: record.dailyId,
              employeeId: record.employee.id,
              attendanceDate: new Date(`${record.date}T00:00:00.000Z`),
              departmentIdSnapshot: record.employee.departmentId,
              departmentNameSnapshot: record.employee.department.name,
              positionIdSnapshot: record.employee.positionId,
              positionNameSnapshot: record.employee.position.name,
            },
          });
          for (const event of record.events) {
            const objectKey = `attendance/${record.employee.id}/${event.photoId}.jpg`;
            const requestId = stableUuid(`${SEED_ID}:request:${event.id}`);
            const data = {
              id: event.id,
              dailyRecordId: daily.id,
              eventType: event.type,
              eventTime: event.timeAt,
              clientCapturedAt: event.timeAt,
              isOutsideSchedule: false,
              isLate: event.type === 'CHECK_IN' && event.flag,
              isEarlyDeparture: event.type === 'CHECK_OUT' && event.flag,
              reason: event.flag
                ? `[SIMULASI DEMO] ${event.type === 'CHECK_IN' ? 'Terlambat' : 'Pulang lebih awal'} — data teknis Test Company, bukan presensi faktual.`
                : '[SIMULASI DEMO] Data teknis Test Company, bukan presensi faktual.',
              photoObjectId: event.photoId,
              captureMethod: 'MANUAL',
              latitude: -6.2000000,
              longitude: 106.8166667,
              accuracyMeters: 25,
              locationCapturedAt: event.timeAt,
              policySnapshot: {
                policyId: policy.id,
                policyName: policy.name,
                timezone: policy.timezone,
                workDays: policy.workDays,
                checkInTime: policy.checkInTime,
                checkOutTime: policy.checkOutTime,
                cutoffTime: policy.cutoffTime,
                scheduleType: 'REGULAR_WORKDAY',
                isOutsideSchedule: false,
                holidayDescription: null,
                seedType: 'DEMO',
              },
            };
            await tx.attEvent.create({ data });
            await tx.mediaObject.create({
              data: {
                id: event.photoId,
                ownerEmployeeId: record.employee.id,
                ownerAccountId: record.employee.account.id,
                purpose: event.purpose,
                status: 'READY',
                idempotencyKey: event.idempotencyKey,
                requestHash: event.requestHash,
                checksumSha256: event.checksumSha256,
                bucket,
                objectKey,
                byteSize: record.employee.avatar.length,
                width: 640,
                height: 640,
                boundEventId: event.id,
                boundAt: new Date(),
                readyAt: new Date(),
              },
            });
            await tx.mediaAuditLog.create({ data: { actorAccountId: hr.id, action: 'DEMO_SEED_OBJECT_BOUND', entityId: event.photoId, requestId } });
            await tx.attAuditLog.create({
              data: {
                actorAccountId: hr.id,
                action: 'DEMO_ATTENDANCE_EVENT_CREATED',
                entityType: 'ATTENDANCE',
                entityId: daily.id,
                reason: 'SIMULASI DEMO Test Company; event historis sintetis.',
                details: { eventId: event.id, eventType: event.type, photoObjectId: event.photoId, seedId: SEED_ID },
                requestId,
              },
            });
          }
        }
        await tx.attAuditLog.create({
          data: {
            actorAccountId: hr.id,
            action: 'DEMO_ATTENDANCE_SEED_APPLIED',
            entityType: 'DEMO_SEED',
            reason: SEED_ID,
            details: summary,
            requestId: stableUuid(`${SEED_ID}:batch`),
          },
        });
      }, { maxWait: 10_000, timeout: 180_000 });
    } catch (error) {
      await storage.removeObjects(bucket, addedKeys).catch(() => undefined);
      throw error;
    }
    console.log(`PASS demo seed applied: workdays=${summary.workdays}, absences=${summary.absences}, dailyRecords=${summary.dailyRecords}, events=${summary.events}, photos=${summary.photos}.`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv.some((argument) => argument === '--dry-run' || argument === '--apply-live')) {
  main().catch((error) => {
    console.error(`DEMO SEED STOP: ${error instanceof Error ? error.message : 'unexpected error'}`);
    process.exitCode = 1;
  });
}
