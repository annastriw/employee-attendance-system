import { AttendanceConfig } from './attendance.config';
describe('Attendance runtime isolation', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ATTENDANCE_TEST_DATABASE_URL =
      'mysql://attendance_test:test@127.0.0.1:3307/attendance_test';
    process.env.INTERNAL_SERVICE_SECRET = 'a'.repeat(64);
    process.env.MEDIA_INTERNAL_SECRET = 'b'.repeat(64);
    process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:3001';
    process.env.EMPLOYEE_SERVICE_URL = 'http://127.0.0.1:3002';
    process.env.MEDIA_SERVICE_URL = 'http://127.0.0.1:3004';
    process.env.PORT = '3003';
  });
  afterEach(() => {
    process.env = { ...env };
  });
  it('never falls back from an empty test URL to the development database', () => {
    process.env.ATTENDANCE_TEST_DATABASE_URL = '';
    expect(() => new AttendanceConfig()).toThrow();
  });
  it('requires the isolated schema and port for tests', () => {
    process.env.ATTENDANCE_TEST_DATABASE_URL =
      'mysql://attendance_test:test@127.0.0.1:3307/attendance_dev';
    expect(() => new AttendanceConfig()).toThrow('isolated');
  });
  it('requires service keys and never starts the recovery worker during tests', () => {
    expect(new AttendanceConfig().workerEnabled).toBe(false);
    process.env.MEDIA_INTERNAL_SECRET = '';
    expect(() => new AttendanceConfig()).toThrow('secrets');
  });
  it('rejects external unencrypted service origins and URL credentials', () => {
    process.env.MEDIA_SERVICE_URL = 'http://example.invalid';
    expect(() => new AttendanceConfig()).toThrow('HTTPS');
    process.env.MEDIA_SERVICE_URL = 'https://user:pass@example.invalid';
    expect(() => new AttendanceConfig()).toThrow('HTTPS');
  });
  it('rejects root access even for tests', () => {
    process.env.ATTENDANCE_TEST_DATABASE_URL =
      'mysql://root:test@127.0.0.1:3307/attendance_test';
    expect(() => new AttendanceConfig()).toThrow('restricted');
  });
});
