import { ConflictException } from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { PositionsService } from './positions.service';
import type { DatabaseService } from '../database/database.module';

const actor = { accountId: 'admin', requestId: 'request' };
const row = { id: 'position', name: 'Analis', code: 'ANL', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
function setup() {
  const tx = {
    empPosition: { findUnique: jest.fn().mockResolvedValue(row), findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(row), update: jest.fn().mockResolvedValue({ ...row, status: 'INACTIVE' }) },
    empAuditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const transaction = jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  const service = new PositionsService({ client: { $transaction: transaction } } as unknown as DatabaseService);
  return { service, tx, transaction };
}
describe('Positions transactions', () => {
  it('writes creation and actor audit in the same transaction', async () => {
    const { service, tx, transaction } = setup();
    await service.create({ name: 'Analis', code: 'ANL' }, actor);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.empAuditLog.create).toHaveBeenCalledWith({ data: {
      entityType: 'POSITION', entityId: row.id, action: 'POSITION_CREATED', actorAccountId: 'admin', requestId: 'request',
    } });
  });
  it('does not write or audit an unchanged status or unchanged edit', async () => {
    const { service, tx } = setup();
    await service.setStatus(row.id, 'ACTIVE', actor);
    await service.update(row.id, {}, actor);
    expect(tx.empPosition.update).not.toHaveBeenCalled();
    expect(tx.empAuditLog.create).not.toHaveBeenCalled();
  });
  it('propagates an audit failure to abort the transaction', async () => {
    const { service, tx } = setup();
    tx.empAuditLog.create.mockRejectedValue(new Error('audit failed'));
    await expect(service.create({ name: 'Analis', code: 'ANL' }, actor)).rejects.toThrow('audit failed');
  });
  it('turns a concurrent unique constraint failure into 409', async () => {
    const { service, tx } = setup();
    tx.empPosition.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7.10.0' }));
    await expect(service.create({ name: 'Analis', code: 'ANL' }, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.empAuditLog.create).not.toHaveBeenCalled();
  });
});
