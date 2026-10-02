import { MediaConfig, httpOrigin } from './media.config';

describe('Media endpoint origins', () => {
  it('allows loopback HTTP and verified external HTTPS', () => {
    expect(httpOrigin('http://127.0.0.1:9000').origin).toBe(
      'http://127.0.0.1:9000',
    );
    expect(httpOrigin('https://storage.example.invalid').origin).toBe(
      'https://storage.example.invalid',
    );
  });
  it.each([
    'http://storage.example.invalid',
    'https://user:secret@storage.example.invalid',
    'https://storage.example.invalid/path',
    'https://storage.example.invalid?token=secret',
    'not-a-url',
  ])(
    'rejects unsafe or malformed origins without echoing configuration: %s',
    (value) => {
      expect(() => httpOrigin(value)).toThrow();
      try {
        httpOrigin(value);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain(value);
        expect((error as Error).message).not.toContain('secret');
      }
    },
  );
});

describe('Media test isolation', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      MEDIA_TEST_DATABASE_URL:
        'mysql://attendance_media_test:test-secret@127.0.0.1:3307/attendance_test',
      MEDIA_S3_ENDPOINT: 'http://127.0.0.1:9000',
      MEDIA_S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
      MEDIA_S3_TEST_BUCKET: 'attendance-photos-test',
      MEDIA_S3_TEST_ACCESS_KEY: 'test-user',
      MEDIA_S3_TEST_SECRET_KEY: 'a'.repeat(64),
      MEDIA_INTERNAL_SECRET: 'b'.repeat(64),
      AUTH_SERVICE_URL: 'http://127.0.0.1:3001',
      PORT: '3004',
    });
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  it('accepts only the isolated local test schema and bucket', () => {
    expect(new MediaConfig().bucket).toBe('attendance-photos-test');
    process.env.MEDIA_S3_TEST_BUCKET = 'attendance-photos';
    expect(() => new MediaConfig()).toThrow('Test storage');
  });
  it('rejects remote storage and wrong database targets during tests', () => {
    process.env.MEDIA_S3_ENDPOINT = 'https://storage.example.invalid';
    expect(() => new MediaConfig()).toThrow('Test storage');
    process.env.MEDIA_S3_ENDPOINT = 'http://127.0.0.1:9000';
    process.env.MEDIA_TEST_DATABASE_URL =
      'mysql://attendance_media_test:test-secret@127.0.0.1:3307/attendance_dev';
    expect(() => new MediaConfig()).toThrow('test database');
  });
});
