import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ParseUUIDPipe } from '@nestjs/common';
import { DepartmentsController } from './departments/departments.controller';
import { PositionsController } from './positions/positions.controller';

describe.each([DepartmentsController, PositionsController])('%s database ID routes', controller => {
  for (const method of ['get', 'update', 'activate', 'deactivate']) {
    const argumentsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) as Record<string, { data: string; pipes: ParseUUIDPipe[] }>;
    const pipe = Object.values(argumentsMetadata).find(argument => argument.data === 'id')!.pipes[0];
    it.each(['3b81c559-bfef-11f1-85c7-76e03cd5f3d3', 'ed1ee3a0-0da2-4529-8694-d5e6e582c063', '1b5558fb-c9b3-5db5-864a-4455374a9234'])(
      method + ' accepts UUID %s', async id => {
        await expect(pipe.transform(id, { type: 'param', data: 'id' })).resolves.toBe(id);
      },
    );
    it(method + ' rejects malformed IDs', async () => {
      await expect(pipe.transform('not-a-uuid', { type: 'param', data: 'id' })).rejects.toThrow();
    });
  }
});
