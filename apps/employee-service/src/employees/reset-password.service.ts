import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { ProvisioningAuthClient } from './provisioning-auth.client';

type Actor = { accountId: string; requestId?: string };

@Injectable()
export class EmployeeResetPasswordService {
  constructor(
    private readonly database: DatabaseService,
    private readonly accounts: ProvisioningAuthClient,
  ) {}

  async reset(operationId: string, employeeId: string, actor: Actor) {
    const employee = await this.database.client.empEmployee.findUnique({
      where: { id: employeeId },
      include: { provisioning: true },
    });
    if (!employee || !employee.ready || employee.provisioning?.status !== 'COMPLETED') {
      throw new NotFoundException('Karyawan tidak ditemukan.');
    }
    if (employee.status === 'ARCHIVED') {
      throw new ConflictException('Karyawan arsip tidak dapat di-reset password.');
    }

    // Mutual exclusion: both email and lifecycle touch the auth account and sessions
    const pendingEmail = await this.database.client.empEmailChange.findFirst({
      where: { employeeId, status: 'PENDING' },
    });
    if (pendingEmail) {
      throw new ConflictException('Selesaikan atau pulihkan perubahan email yang masih diproses.');
    }
    const pendingLifecycle = await this.database.client.empLifecycleChange.findFirst({
      where: { employeeId, status: 'PENDING' },
    });
    if (pendingLifecycle) {
      throw new ConflictException('Perubahan status sebelumnya masih diproses. Lanjutkan operasi yang sama.');
    }

    // Call Auth Service internal endpoint
    const result = await this.accounts.call<{ email: string; temporaryPassword: string }>(
      operationId,
      'reset-password',
      { employeeId, actorAccountId: actor.accountId },
      actor.requestId,
    );

    // Record history & audit local in one transaction
    await this.database.client.$transaction(async (tx) => {
      await tx.empEmployeeHistory.create({
        data: {
          employeeId,
          actorAccountId: actor.accountId,
          action: 'EMPLOYEE_PASSWORD_RESET',
          before: {},
          after: { mustChangePassword: true },
          requestId: actor.requestId,
        },
      });
      await tx.empAuditLog.create({
        data: {
          entityType: 'EMPLOYEE',
          entityId: employeeId,
          action: 'EMPLOYEE_PASSWORD_RESET',
          actorAccountId: actor.accountId,
          requestId: actor.requestId,
        },
      });
    });

    return result;
  }
}
