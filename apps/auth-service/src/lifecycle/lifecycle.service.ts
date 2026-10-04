import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { ChangeAccountLifecycleDto, LifecycleStatus } from './lifecycle.dto';

// Which account statuses may precede each target, mirroring the Employee state machine.
const ALLOWED_FROM: Record<LifecycleStatus, LifecycleStatus[]> = {
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'INACTIVE'],
};

@Injectable()
export class AccountLifecycleService {
  constructor(private readonly database: DatabaseService) {}

  async change(id: string, input: ChangeAccountLifecycleDto, requestId?: string) {
    const receipt = (accountId: string) => ({ operationId: id, employeeId: input.employeeId, status: input.targetStatus, accountId });
    return this.database.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${input.actorAccountId} FOR UPDATE`;
      const actor = await tx.authAccount.findUnique({ where: { id: input.actorAccountId } });
      if (!actor || actor.role !== 'ADMIN_HRD' || actor.status !== 'ACTIVE' || actor.mustChangePassword)
        throw new ForbiddenException('Admin perubahan status tidak valid.');
      const target = await tx.authAccount.findUnique({ where: { employeeId: input.employeeId } });
      if (!target) throw new NotFoundException('Akun karyawan tidak ditemukan.');
      await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${target.id} FOR UPDATE`;
      const account = await tx.authAccount.findUniqueOrThrow({ where: { id: target.id } });
      if (account.role !== 'EMPLOYEE') throw new ConflictException('Akun bukan karyawan.');
      // Idempotent replay: already at target with a matching expected transition -> return the same receipt.
      if (account.status === input.targetStatus) return receipt(account.id);
      if (account.status !== input.expectedStatus)
        throw new ConflictException('Status akun berubah. Muat ulang sebelum mengubah status.');
      if (!ALLOWED_FROM[input.targetStatus].includes(account.status))
        throw new ConflictException('Transisi status tidak diizinkan.');
      await tx.authAccount.update({
        where: { id: account.id },
        data: {
          status: input.targetStatus,
          archivedAt: input.targetStatus === 'ARCHIVED' ? new Date() : null,
        },
      });
      // Any non-ACTIVE target cuts live access immediately; idempotent on already-revoked rows.
      if (input.targetStatus !== 'ACTIVE')
        await tx.authSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.authAuditLog.create({
        data: { actorAccountId: input.actorAccountId, targetAccountId: account.id, action: 'EMPLOYEE_LIFECYCLE_' + input.targetStatus, requestId },
      });
      return receipt(account.id);
    });
  }
}
