import { GatewayConfig } from './gateway.config';

describe('GatewayConfig', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:3001';
    process.env.EMPLOYEE_SERVICE_URL = 'http://127.0.0.1:3002';
    process.env.ATTENDANCE_SERVICE_URL = 'http://127.0.0.1:3003';
    process.env.MEDIA_SERVICE_URL = 'http://127.0.0.1:3004';
    process.env.GATEWAY_ALLOWED_ORIGINS = 'https://hr.example.test';
    process.env.PORT = '3000';
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  it('requires an explicit, credential-free Employee upstream in production', () => {
    delete process.env.EMPLOYEE_SERVICE_URL;
    expect(() => new GatewayConfig()).toThrow('EMPLOYEE_SERVICE_URL wajib');
    process.env.EMPLOYEE_SERVICE_URL = 'http://user:pw@127.0.0.1:3002';
    expect(() => new GatewayConfig()).toThrow('EMPLOYEE_SERVICE_URL');
    process.env.EMPLOYEE_SERVICE_URL = 'http://127.0.0.1:3002';
    expect(new GatewayConfig().employeeUrl).toBe('http://127.0.0.1:3002');
  });
  it('requires an explicit, credential-free Attendance upstream in production', () => {
    delete process.env.ATTENDANCE_SERVICE_URL;
    expect(() => new GatewayConfig()).toThrow('ATTENDANCE_SERVICE_URL wajib');
    process.env.ATTENDANCE_SERVICE_URL = 'http://user:pw@127.0.0.1:3003';
    expect(() => new GatewayConfig()).toThrow('ATTENDANCE_SERVICE_URL');
    process.env.ATTENDANCE_SERVICE_URL = 'http://127.0.0.1:3003';
    process.env.MEDIA_SERVICE_URL = 'http://127.0.0.1:3004';
    expect(new GatewayConfig().attendanceUrl).toBe('http://127.0.0.1:3003');
  });
  it('requires an explicit, credential-free Media upstream in production', () => {
    delete process.env.MEDIA_SERVICE_URL;
    expect(() => new GatewayConfig()).toThrow('MEDIA_SERVICE_URL wajib');
    process.env.MEDIA_SERVICE_URL = 'http://user:pw@127.0.0.1:3004';
    expect(() => new GatewayConfig()).toThrow('MEDIA_SERVICE_URL');
    process.env.MEDIA_SERVICE_URL = 'http://127.0.0.1:3004';
    expect(new GatewayConfig().mediaUrl).toBe('http://127.0.0.1:3004');
  });

  it('requires explicit production upstream and browser origins', () => {
    delete process.env.AUTH_SERVICE_URL;
    expect(() => new GatewayConfig()).toThrow('wajib');
    process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:3001';
    delete process.env.GATEWAY_ALLOWED_ORIGINS;
    expect(() => new GatewayConfig()).toThrow('GATEWAY_ALLOWED_ORIGINS');
  });
  it.each([
    'http://user:password@localhost:3001',
    'http://localhost:3001/path',
    'file:///secret',
    'http://localhost:3001?token=value',
  ])('rejects unsafe upstream %s', (url) => {
    process.env.AUTH_SERVICE_URL = url;
    expect(() => new GatewayConfig()).toThrow();
  });
  it.each([
    '*',
    'http://public.example.test',
    'https://hr.example.test/path',
    'not-a-url',
  ])('rejects invalid origin %s', (origin) => {
    process.env.GATEWAY_ALLOWED_ORIGINS = origin;
    expect(() => new GatewayConfig()).toThrow();
  });
  it('accepts HTTPS origins and a local HTTP upstream', () => {
    const config = new GatewayConfig();
    expect(config.port).toBe(3000);
    expect(config.origins).toEqual(['https://hr.example.test']);
  });
});
