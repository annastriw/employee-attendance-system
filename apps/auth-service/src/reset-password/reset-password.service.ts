import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { hash } from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import type { ResetEmployeePasswordDto } from './reset-password.dto';

export const resetPasswordHash = (input: ResetEmployeePasswordDto) =>
  createHash('sha256').update(JSON.stringify({ employeeId: input.employeeId, actorAccountId: input.actorAccountId })).digest('hex');

@Injectable()
export class AccountResetPasswordService {
  constructor(private readonly database: DatabaseService) {}

  async reset(id: string, input: ResetEmployeePasswordDto, requestId?: string) {
    const payloadHash = resetPasswordHash(input);
    const existing = await this.database.client.authPasswordReset.findUnique({ where: { id } });
    if (existing) {
      if (existing.payloadHash !== payloadHash)
        throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.');
      throw new ConflictException('Password sudah ditampilkan.');
    }

    const password = randomBytes(24).toString('base64url');
    const passwordHash = await hash(password, 12);

    try {
      return await this.database.client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${input.actorAccountId} FOR UPDATE`;
        const actor = await tx.authAccount.findUnique({ where: { id: input.actorAccountId } });
        if (!actor || actor.role !== 'ADMIN_HRD' || actor.status !== 'ACTIVE' || actor.mustChangePassword) {
          throw new ForbiddenException('Admin reset password tidak valid.');
        }

        const target = await tx.authAccount.findUnique({ where: { employeeId: input.employeeId } });
        if (!target) throw new NotFoundException('Akun karyawan tidak ditemukan.');

        await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${target.id} FOR UPDATE`;
        const replay = await tx.authPasswordReset.findUnique({ where: { id } });
        if (replay) {
          if (replay.payloadHash !== payloadHash)
            throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.');
          throw new ConflictException('Password sudah ditampilkan.');
        }

        const account = await tx.authAccount.findUniqueOrThrow({ where: { id: target.id } });
        if (account.role !== 'EMPLOYEE') throw new ConflictException('Akun bukan karyawan.');
        if (account.status === 'ARCHIVED') throw new ConflictException('Akun arsip tidak dapat di-reset password.');

        await tx.authAccount.update({
          where: { id: account.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            passwordChangedAt: null,
          },
        });

        await tx.authSession.updateMany({
          where: { accountId: account.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        await tx.authPasswordReset.create({
          data: {
            id,
            accountId: account.id,
            actorAccountId: input.actorAccountId,
            payloadHash,
            claimedAt: new Date(),
          },
        });

        await tx.authAuditLog.create({
          data: {
            actorAccountId: input.actorAccountId,
            targetAccountId: account.id,
            action: 'EMPLOYEE_PASSWORD_RESET',
            requestId,
          },
        });

        return { email: account.email, temporaryPassword: password };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.authPasswordReset.findUnique({ where: { id } });
        if (winner) {
          if (winner.payloadHash !== payloadHash)
            throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.');
          throw new ConflictException('Password sudah ditampilkan.');
        }
      }
      throw error;
    }
  }
}
