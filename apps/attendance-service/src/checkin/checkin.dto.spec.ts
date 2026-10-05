import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckOutDto } from './checkin.dto';

const payload = {
  clientCapturedAt: '2026-10-05T10:00:00+07:00', captureMethod: 'MANUAL',
  location: { latitude: -6, longitude: 106, accuracyMeters: 5, capturedAt: '2026-10-05T10:00:00+07:00' },
};
describe('Checkout database references', () => {
  it.each(['3b81c559-bfef-11f1-85c7-76e03cd5f3d3', 'ed1ee3a0-0da2-4529-8694-d5e6e582c063', '1b5558fb-c9b3-5db5-864a-4455374a9234'])(
    'accepts daily/photo UUID %s', async id => {
      expect(await validate(plainToInstance(CheckOutDto, { ...payload, dailyRecordId: id, photoObjectId: id }))).toHaveLength(0);
    },
  );
  it('rejects invalid photo/daily references', async () => {
    const errors = await validate(plainToInstance(CheckOutDto, { ...payload, dailyRecordId: 'bad', photoObjectId: 'bad' }));
    expect(errors.map(error => error.property).sort()).toEqual(['dailyRecordId', 'photoObjectId']);
  });
});
