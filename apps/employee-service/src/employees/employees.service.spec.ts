import { randomUUID } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { EmployeesService, employeePayloadHash } from './employees.service';
import { validCalendarDate, type CreateEmployeeDto } from './employees.dto';
import type { DatabaseService } from '../database/database.module';
import type { ProvisioningAuthClient } from './provisioning-auth.client';
import type { EmployeeConfig } from '../config/employee.config';
const id = randomUUID(), actorId = randomUUID();
const input: CreateEmployeeDto = { nik: 'TEST-01', name: 'Test Employee', email: 'employee@example.test', departmentId: randomUUID(), positionId: randomUUID(), startDate: '2026-10-02', status: 'ACTIVE' };
function setup() {
  const row = { id, employeeId: randomUUID(), actorAccountId: actorId, payloadHash: employeePayloadHash(input), email: input.email, desiredStatus: 'ACTIVE', status: 'PENDING', phase: 'PREPARE', attempts: 0, requestId: null, errorCode: null as string | null };
  const tx = { empProvisioning: { findUnique: jest.fn().mockResolvedValue(row), findUniqueOrThrow: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, empEmployee: { create: jest.fn(), update: jest.fn() }, empAuditLog: { create: jest.fn().mockResolvedValue({}) } };
  const client = { ...tx, $transaction: (work: (value: typeof tx) => unknown) => work(tx) };
  const accounts = { call: jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
  const service = new EmployeesService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient, { workerEnabled: false } as EmployeeConfig);
  return { row, tx, accounts, service };
}
describe('Employee provisioning retry invariants', () => {
  it('accepts real calendar dates and rejects rollover/non-dates', () => {
    expect(validCalendarDate('2024-02-29')).toBe(true); expect(validCalendarDate('2026-02-29')).toBe(false); expect(validCalendarDate('2026-02-30')).toBe(false); expect(validCalendarDate('2026-13-01')).toBe(false); expect(validCalendarDate('bad')).toBe(false);
  });
  it('rejects a reused key with another payload before creating another profile', async () => {
    const { service, tx } = setup();
    await expect(service.create(id, Object.assign({}, input, { email: 'other@example.test' }), { accountId: actorId })).rejects.toThrow('data lain');
    expect(tx.empEmployee.create).not.toHaveBeenCalled();
  });
  it('persists a recoverable upstream timeout without marking successful', async () => {
    const { service, tx } = setup(); await service.runOne(id);
    expect(tx.empProvisioning.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', errorCode: 'AUTH_UNAVAILABLE', attempts: { increment: 1 }, leaseUntil: null, leaseToken: null, nextAttemptAt: expect.any(Date) }) }));
    expect(tx.empEmployee.update).not.toHaveBeenCalled();
    expect(JSON.stringify(tx.empAuditLog.create.mock.calls)).not.toContain('password');
  });
  it('does not contact Auth when another worker owns the lease', async () => {
    const { service, tx, accounts } = setup(); tx.empProvisioning.updateMany.mockResolvedValue({ count: 0 });
    await service.runOne(id); expect(accounts.call).not.toHaveBeenCalled();
  });
  it('cannot correct email after prepare already published an account', async () => {
    const { service, row, tx } = setup(); row.status = 'FAILED'; row.phase = 'PUBLISH'; row.errorCode = 'EMAIL_CONFLICT';
    await expect(service.retry(id, { accountId: actorId }, { email: 'other@example.test' })).rejects.toThrow('Email hanya dapat diperbaiki');
    expect(tx.empProvisioning.updateMany).not.toHaveBeenCalled();
  });
  it('does not expose another actor operation', async () => {
    const { service } = setup(); await expect(service.operation(id, { accountId: randomUUID() })).rejects.toThrow('tidak ditemukan');
  });
});
