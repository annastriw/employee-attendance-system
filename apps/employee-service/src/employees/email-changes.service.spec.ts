import { ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EmployeeEmailChangesService } from './email-changes.service';
import type { DatabaseService } from '../database/database.module';
import type { EmployeeConfig } from '../config/employee.config';
import type { ProvisioningAuthClient } from './provisioning-auth.client';

function setup() {
  const row = { id: randomUUID(), employeeId: randomUUID(), actorAccountId: randomUUID(), expectedEmail: 'old@example.test', email: 'new@example.test', requestId: null, attempts: 30 };
  const tx = { empEmailChange: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(row) }, empEmployee: { update: jest.fn() }, empAuditLog: { create: jest.fn() } };
  const client = { ...tx, $transaction: (work: (value: typeof tx) => unknown) => work(tx) };
  const accounts = { call: jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
  const service = new EmployeeEmailChangesService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient, { workerEnabled: false } as EmployeeConfig);
  return { row, tx, accounts, service };
}
describe('Email change recovery safety', () => {
  it('keeps an ambiguous timeout pending after many attempts, preserving the old projection', async () => {
    const { row, tx, service } = setup();
    await service.runOne(row.id);
    expect(tx.empEmailChange.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', errorCode: 'AUTH_UNAVAILABLE', leaseToken: null, leaseUntil: null }) }));
    expect(tx.empEmployee.update).not.toHaveBeenCalled();
  });
  it('does not contact Auth when a different worker owns the lease', async () => {
    const { row, tx, accounts, service } = setup();
    tx.empEmailChange.updateMany.mockResolvedValue({ count: 0 });
    await service.runOne(row.id); expect(accounts.call).not.toHaveBeenCalled();
  });
  it('rejects a mismatched receipt and retains recovery instead of publishing a wrong email', async () => {
    const { row, tx, accounts, service } = setup();
    accounts.call.mockResolvedValue({ operationId: row.id, employeeId: row.employeeId, email: 'wrong@example.test' } as never);
    await service.runOne(row.id);
    expect(tx.empEmployee.update).not.toHaveBeenCalled();
    expect(tx.empEmailChange.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }));
  });
});