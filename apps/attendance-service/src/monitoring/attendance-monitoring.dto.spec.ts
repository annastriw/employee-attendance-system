import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MonitoringEmployeesQueryDto } from './attendance-monitoring.dto';

describe('Monitoring department filter validation', () => {
  it.each(['3b81c559-bfef-11f1-85c7-76e03cd5f3d3', 'c2345678-1234-4234-8234-123456789012'])(
    'accepts database UUID %s', async (departmentId) => {
      expect(await validate(plainToInstance(MonitoringEmployeesQueryDto, { departmentId }))).toHaveLength(0);
    },
  );
  it.each(['all', 'invalid', '3b81c559-bfef-11f1-85c7'])('rejects malformed ID %s', async (departmentId) => {
    const errors = await validate(plainToInstance(MonitoringEmployeesQueryDto, { departmentId }));
    expect(errors.map(error => error.property)).toEqual(['departmentId']);
  });
});
