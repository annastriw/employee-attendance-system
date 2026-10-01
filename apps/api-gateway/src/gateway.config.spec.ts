import { GatewayConfig } from './gateway.config';

describe('GatewayConfig', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:3001';
    process.env.GATEWAY_ALLOWED_ORIGINS = 'https://hr.example.test';
    process.env.PORT = '3000';
  });
  afterEach(() => {
    process.env = { ...saved };
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
