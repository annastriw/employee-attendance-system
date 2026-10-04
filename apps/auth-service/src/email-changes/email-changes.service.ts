import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import type { ChangeEmployeeEmailDto } from './email-changes.dto';

export const emailChangeHash = (input: ChangeEmployeeEmailDto) => createHash('sha256').update(JSON.stringify({
  employeeId: input.employeeId, actorAccountId: input.actorAccountId, expectedEmail: input.expectedEmail, email: input.email,
})).digest('hex');

@Injectable()
export class AccountEmailChangesService {
  constructor(private readonly database: DatabaseService) {}
  async change(id: string, input: ChangeEmployeeEmailDto, requestId?: string) {
    if (input.email === input.expectedEmail) throw new BadRequestException('Gunakan email baru yang berbeda.');
    const payloadHash = emailChangeHash(input);
    const receipt = (row: { id: string; payloadHash: string; email: string }) => {
      if (row.payloadHash !== payloadHash) throw new ConflictException('Operasi email memiliki data berbeda.');
      return { operationId: row.id, employeeId: input.employeeId, email: row.email };
    };
    const existing = await this.database.client.authEmailChange.findUnique({ where: { id } });
    if (existing) return receipt(existing);
    try {
      return await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${input.actorAccountId} FOR UPDATE`;
        const actor = await tx.authAccount.findUnique({ where: { id: input.actorAccountId } });
        if (!actor || actor.role !== 'ADMIN_HRD' || actor.status !== 'ACTIVE' || actor.mustChangePassword)
          throw new ForbiddenException('Admin perubahan email tidak valid.');
        const target = await tx.authAccount.findUnique({ where: { employeeId: input.employeeId } });
        if (!target) throw new NotFoundException('Akun karyawan tidak ditemukan.');
        await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${target.id} FOR UPDATE`;
        const replay = await tx.authEmailChange.findUnique({ where: { id } });
        if (replay) return receipt(replay);
        const account = await tx.authAccount.findUniqueOrThrow({ where: { id: target.id } });
        if (account.role !== 'EMPLOYEE' || account.status === 'ARCHIVED')
          throw new ConflictException('Akun karyawan tidak dapat diubah.');
        if (account.email !== input.expectedEmail) throw new ConflictException('Email akun berubah. Muat ulang sebelum mengubah email.');
        await tx.authAccount.update({ where: { id: account.id }, data: { email: input.email } });
        await tx.authSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
        const saved = await tx.authEmailChange.create({ data: { id, accountId: account.id, actorAccountId: input.actorAccountId, payloadHash, email: input.email } });
        await tx.authAuditLog.create({ data: { actorAccountId: input.actorAccountId, targetAccountId: account.id, action: 'EMPLOYEE_EMAIL_CHANGED', requestId } });
        return receipt(saved);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.authEmailChange.findUnique({ where: { id } });
        if (winner) return receipt(winner);
        throw new ConflictException('Email sudah digunakan.');
      }
      throw error;
    }
  }
}