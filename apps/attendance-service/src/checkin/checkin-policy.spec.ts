import {
  payloadHash,
  validateEvidence,
  type CheckInInput,
} from './checkin-policy';
const at = new Date('2026-10-05T01:00:00.000Z');
const input = (): CheckInInput => ({
  photoObjectId: '90a163ef-d595-41ab-872d-46a852c7c07a',
  captureMethod: 'AUTO',
  clientCapturedAt: '2026-10-05T08:00:00.000+07:00',
  location: {
    latitude: -6,
    longitude: 106,
    accuracyMeters: 25,
    capturedAt: '2026-10-05T08:00:00.000+07:00',
  },
});
describe('check-in evidence policy', () => {
  it('uses canonical instants, trimmed reasons and stable field ordering', () => {
    const a = input();
    expect(payloadHash({ ...a, reason: ' alasan ' })).toBe(
      payloadHash({
        ...a,
        clientCapturedAt: at.toISOString(),
        reason: 'alasan',
      }),
    );
    expect(payloadHash(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(payloadHash(a)).not.toBe(
      payloadHash({ ...a, captureMethod: 'MANUAL' }),
    );
    expect(payloadHash(a)).not.toBe(
      payloadHash({ ...a, location: { ...a.location, latitude: -7 } }),
    );
  });
  it('accepts fresh location at the exact 60s and future 5s boundaries', () => {
    expect(() => validateEvidence(input(), at)).not.toThrow();
    const a = input();
    a.location.capturedAt = new Date(at.getTime() - 60000).toISOString();
    expect(() => validateEvidence(a, at)).not.toThrow();
    a.location.capturedAt = new Date(at.getTime() + 5000).toISOString();
    expect(() => validateEvidence(a, at)).not.toThrow();
  });
  it.each([-60001, 5001])(
    'rejects location outside freshness boundary %d',
    (delta) => {
      const a = input();
      a.location.capturedAt = new Date(at.getTime() + delta).toISOString();
      expect(() => validateEvidence(a, at)).toThrow('Perbarui lokasi');
    },
  );
  it('rejects future capture time but never uses the client clock as attendance time', () => {
    const a = input();
    a.clientCapturedAt = new Date(at.getTime() + 5001).toISOString();
    expect(() => validateEvidence(a, at)).toThrow('Waktu foto');
    a.clientCapturedAt = '2026-10-04T00:00:00.000Z';
    expect(() => validateEvidence(a, at)).not.toThrow();
  });
});
