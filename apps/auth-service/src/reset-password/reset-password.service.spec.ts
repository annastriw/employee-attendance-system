import { AccountResetPasswordService, resetPasswordHash } from './reset-password.service';
import type { DatabaseService } from '../database/database.service';
import { randomUUID } from 'node:crypto';

const input = { employeeId: randomUUID(), actorAccountId: randomUUID() };

describe('Auth AccountResetPasswordService', () => {
  it('rejects replay with the same id once claimed (Password sudah ditampilkan)', async () => {
    const row = { id: randomUUID(), payloadHash: resetPasswordHash(input), accountId: randomUUID() };
    const client = { authPasswordReset: { findUnique: jest.fn().mockResolvedValue(row) }, $transaction: jest.fn() };
    const service = new AccountResetPasswordService({ client } as unknown as DatabaseService);
    await expect(service.reset(row.id, input)).rejects.toThrow('Password sudah ditampilkan.');
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('rejects another payload/actor using the same operation id', async () => {
    const row = { id: randomUUID(), payloadHash: resetPasswordHash(input), accountId: randomUUID() };
    const client = { authPasswordReset: { findUnique: jest.fn().mockResolvedValue(row) }, $transaction: jest.fn() };
    const service = new AccountResetPasswordService({ client } as unknown as DatabaseService);
    await expect(service.reset(row.id, { ...input, actorAccountId: randomUUID() })).rejects.toThrow('data lain');
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('rejects reset password if target account is ARCHIVED', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      authAccount: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === input.actorAccountId) return { id: input.actorAccountId, role: 'ADMIN_HRD', status: 'ACTIVE', mustChangePassword: false };
          if (where.employeeId === input.employeeId) return { id: 'target-acc-id' };
          return null;
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'target-acc-id', role: 'EMPLOYEE', status: 'ARCHIVED' }),
      },
      authPasswordReset: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const client = {
      authPasswordReset: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    };
    const service = new AccountResetPasswordService({ client } as unknown as DatabaseService);
    await expect(service.reset(randomUUID(), input)).rejects.toThrow('Akun arsip tidak dapat di-reset password.');
  });
});
