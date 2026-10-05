import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AttendanceLifecycleService } from './attendance-lifecycle.service';
import { AttendanceListDto } from './attendance-lifecycle.dto';
import type { DatabaseService } from '../database/database.module';
import type { AttendanceUpstreamClient } from '../checkin/attendance-upstream.client';
import type { AuthClient } from '../auth/admin.guard';
import type { ServerClock } from '../checkin/checkin-policy';

describe('Historical attendance category filtering', () => {
  const id = 'ee79c983-1129-5776-b94c-768aea5256e4';
  it('accepts seeded UUIDs and rejects malformed category IDs', async () => {
    expect(
      await validate(
        plainToInstance(AttendanceListDto, {
          departmentId: id,
          positionId: id,
          employeeId: id,
        }),
      ),
    ).toHaveLength(0);
    const errors = await validate(
      plainToInstance(AttendanceListDto, {
        departmentId: 'all',
        positionId: 'oops',
      }),
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'departmentId',
      'positionId',
    ]);
  });
  it.each(['ACTIVE', 'DELETED'] as const)(
    'filters %s snapshots before pagination and uses the same count predicate',
    async (status) => {
      const findMany = jest.fn().mockReturnValue(Promise.resolve([]));
      const count = jest.fn().mockReturnValue(Promise.resolve(41));
      const transaction = jest.fn(async (operations) =>
        Promise.all(operations),
      );
      const db = {
        client: {
          attDailyRecord: { findMany, count },
          $transaction: transaction,
        },
      };
      const service = new AttendanceLifecycleService(
        db as unknown as DatabaseService,
        {} as AttendanceUpstreamClient,
        {} as AuthClient,
        { now: () => new Date('2026-10-05T00:00:00Z') } as ServerClock,
      );
      const result = await service.list(
        plainToInstance(AttendanceListDto, {
          status,
          departmentId: id,
          positionId: id,
          employeeId: id,
          page: 2,
        }),
        'test-request',
      );
      const where = {
        deletedAt: status === 'DELETED' ? { not: null } : null,
        employeeId: id,
        departmentIdSnapshot: id,
        positionIdSnapshot: id,
      };
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 20, take: 20 }),
      );
      expect(count).toHaveBeenCalledWith({ where });
      expect(result.meta).toMatchObject({ total: 41, page: 2, pageSize: 20 });
    },
  );
});
