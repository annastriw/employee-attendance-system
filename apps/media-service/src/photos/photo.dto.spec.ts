import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PhotoBindDto } from './photo.dto';

describe('Photo bind database references', () => {
  it.each(['3b81c559-bfef-11f1-85c7-76e03cd5f3d3', 'ed1ee3a0-0da2-4529-8694-d5e6e582c063', '1b5558fb-c9b3-5db5-864a-4455374a9234'])(
    'accepts event/actor/owner UUID %s', async id => {
      expect(await validate(plainToInstance(PhotoBindDto, { eventId: id, actorAccountId: id, ownerEmployeeId: id, purpose: 'CHECK_IN' }))).toHaveLength(0);
    },
  );
  it('rejects invalid database references', async () => {
    const errors = await validate(plainToInstance(PhotoBindDto, { eventId: 'bad', actorAccountId: 'bad', ownerEmployeeId: 'bad', purpose: 'CHECK_IN' }));
    expect(errors.map(error => error.property).sort()).toEqual(['actorAccountId', 'eventId', 'ownerEmployeeId']);
  });
});
