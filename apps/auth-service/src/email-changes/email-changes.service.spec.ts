import { AccountEmailChangesService, emailChangeHash } from './email-changes.service';
import type { DatabaseService } from '../database/database.service';
import { randomUUID } from 'node:crypto';

const input = { employeeId: randomUUID(), actorAccountId: randomUUID(), expectedEmail: 'old@example.test', email: 'new@example.test' };
describe('Auth email receipt replay safety', () => {
  it('returns a committed receipt without updating email or revoking a newer session', async () => {
    const row = { id: randomUUID(), payloadHash: emailChangeHash(input), email: input.email };
    const client = { authEmailChange: { findUnique: jest.fn().mockResolvedValue(row) }, $transaction: jest.fn() };
    const service = new AccountEmailChangesService({ client } as unknown as DatabaseService);
    await expect(service.change(row.id, input)).resolves.toEqual({ operationId: row.id, employeeId: input.employeeId, email: input.email });
    expect(client.$transaction).not.toHaveBeenCalled();
  });
  it('rejects another payload/actor using the same operation id', async () => {
    const row = { id: randomUUID(), payloadHash: emailChangeHash(input), email: input.email };
    const client = { authEmailChange: { findUnique: jest.fn().mockResolvedValue(row) }, $transaction: jest.fn() };
    const service = new AccountEmailChangesService({ client } as unknown as DatabaseService);
    await expect(service.change(row.id, { ...input, actorAccountId: randomUUID() })).rejects.toThrow('data berbeda');
    await expect(service.change(row.id, { ...input, email: 'different@example.test' })).rejects.toThrow('data berbeda');
    expect(client.$transaction).not.toHaveBeenCalled();
  });
  it('rejects a no-op before reading or changing account data', async () => {
    const client = { authEmailChange: { findUnique: jest.fn() }, $transaction: jest.fn() };
    const service = new AccountEmailChangesService({ client } as unknown as DatabaseService);
    await expect(service.change(randomUUID(), { ...input, email: input.expectedEmail })).rejects.toThrow('email baru');
    expect(client.authEmailChange.findUnique).not.toHaveBeenCalled();
  });
});