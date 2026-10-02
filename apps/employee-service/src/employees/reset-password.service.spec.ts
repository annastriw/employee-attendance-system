import { EmployeeResetPasswordService } from './reset-password.service';
import type { DatabaseService } from '../database/database.module';
import type { ProvisioningAuthClient } from './provisioning-auth.client';
import { randomUUID } from 'node:crypto';

describe('EmployeeResetPasswordService', () => {
  const actor = { accountId: randomUUID(), requestId: 'req-1' };
  const employeeId = randomUUID();
  const operationId = randomUUID();

  it('rejects reset password if employee is ARCHIVED', async () => {
    const client = {
      empEmployee: {
        findUnique: jest.fn().mockResolvedValue({
          id: employeeId,
          ready: true,
          status: 'ARCHIVED',
          provisioning: { status: 'COMPLETED' },
        }),
      },
    };
    const accounts = { call: jest.fn() };
    const service = new EmployeeResetPasswordService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient);

    await expect(service.reset(operationId, employeeId, actor)).rejects.toThrow('Karyawan arsip tidak dapat di-reset password.');
    expect(accounts.call).not.toHaveBeenCalled();
  });

  it('rejects reset password if there is an in-flight pending email change', async () => {
    const client = {
      empEmployee: {
        findUnique: jest.fn().mockResolvedValue({
          id: employeeId,
          ready: true,
          status: 'ACTIVE',
          provisioning: { status: 'COMPLETED' },
        }),
      },
      empEmailChange: { findFirst: jest.fn().mockResolvedValue({ id: 'pending-email-op' }) },
      empLifecycleChange: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const accounts = { call: jest.fn() };
    const service = new EmployeeResetPasswordService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient);

    await expect(service.reset(operationId, employeeId, actor)).rejects.toThrow('Selesaikan atau pulihkan perubahan email');
    expect(accounts.call).not.toHaveBeenCalled();
  });

  it('rejects reset password if there is an in-flight pending lifecycle change', async () => {
    const client = {
      empEmployee: {
        findUnique: jest.fn().mockResolvedValue({
          id: employeeId,
          ready: true,
          status: 'ACTIVE',
          provisioning: { status: 'COMPLETED' },
        }),
      },
      empEmailChange: { findFirst: jest.fn().mockResolvedValue(null) },
      empLifecycleChange: { findFirst: jest.fn().mockResolvedValue({ id: 'pending-lifecycle-op' }) },
    };
    const accounts = { call: jest.fn() };
    const service = new EmployeeResetPasswordService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient);

    await expect(service.reset(operationId, employeeId, actor)).rejects.toThrow('Perubahan status sebelumnya masih diproses');
    expect(accounts.call).not.toHaveBeenCalled();
  });

  it('calls Auth service and records history without logging secret on success', async () => {
    const tx = {
      empEmployeeHistory: { create: jest.fn().mockResolvedValue({ id: 'hist-1' }) },
      empAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const client = {
      empEmployee: {
        findUnique: jest.fn().mockResolvedValue({
          id: employeeId,
          ready: true,
          status: 'ACTIVE',
          provisioning: { status: 'COMPLETED' },
        }),
      },
      empEmailChange: { findFirst: jest.fn().mockResolvedValue(null) },
      empLifecycleChange: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((fn: (c: unknown) => Promise<unknown>) => fn(tx)),
    };
    const accounts = {
      call: jest.fn().mockResolvedValue({ email: 'emp@example.test', temporaryPassword: 'test-temp-password' }),
    };
    const service = new EmployeeResetPasswordService({ client } as unknown as DatabaseService, accounts as unknown as ProvisioningAuthClient);

    const result = await service.reset(operationId, employeeId, actor);
    expect(result).toEqual({ email: 'emp@example.test', temporaryPassword: 'test-temp-password' });
    expect(accounts.call).toHaveBeenCalledWith(
      operationId,
      'reset-password',
      { employeeId, actorAccountId: actor.accountId },
      actor.requestId,
    );
    expect(tx.empEmployeeHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId,
        actorAccountId: actor.accountId,
        action: 'EMPLOYEE_PASSWORD_RESET',
        before: {},
        after: { mustChangePassword: true },
      }),
    });
    // Ensure no password in history payload
    const historyData = tx.empEmployeeHistory.create.mock.calls[0][0].data;
    expect(JSON.stringify(historyData)).not.toContain('test-temp-password');
  });
});
