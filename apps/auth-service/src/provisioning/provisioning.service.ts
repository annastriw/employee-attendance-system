import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { hash } from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';
import { ProvisioningSecurity, sealCredential, openCredential } from './provisioning-security';
import type { PrepareAccountDto, ClaimCredentialDto } from './provisioning.dto';
type Tx = Prisma.TransactionClient;
const digest = (input: PrepareAccountDto) => createHash('sha256').update(JSON.stringify({ employeeId: input.employeeId, actorAccountId: input.actorAccountId, email: input.email, status: input.status })).digest('hex');
const safeReceipt = (row: { id: string; accountId: string; finalized: boolean }) => ({ operationId: row.id, accountId: row.accountId, finalized: row.finalized });
@Injectable()
export class AccountProvisioningService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService, private readonly security: ProvisioningSecurity) {}
  private async actor(tx: Tx, id: string) {
    const actor = await tx.authAccount.findUnique({ where: { id } });
    if (!actor || actor.role !== 'ADMIN_HRD' || actor.status !== 'ACTIVE' || actor.mustChangePassword) throw new ForbiddenException('Admin provisioning tidak valid.');
  }
  private audit(tx: Tx, actorAccountId: string, targetAccountId: string, action: string, requestId?: string) {
    return tx.authAuditLog.create({ data: { actorAccountId, targetAccountId, action, requestId } });
  }
  private async existing(id: string, input: PrepareAccountDto) {
    const row = await this.database.client.authProvisioning.findUnique({ where: { id } });
    if (!row) return null;
    if (row.payloadHash !== digest(input) || row.actorAccountId !== input.actorAccountId) throw new ConflictException('Operasi provisioning memiliki data berbeda.');
    return safeReceipt(row);
  }
  async prepare(id: string, input: PrepareAccountDto, requestId?: string) {
    const existing = await this.existing(id, input); if (existing) return existing;
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await hash(password, 12);
    try {
      return await this.database.client.$transaction(async tx => {
        await this.actor(tx, input.actorAccountId);
        const account = await tx.authAccount.create({ data: { email: input.email, employeeId: input.employeeId, passwordHash, role: 'EMPLOYEE', status: 'INACTIVE', mustChangePassword: true } });
        const row = await tx.authProvisioning.create({ data: { id, accountId: account.id, actorAccountId: input.actorAccountId, payloadHash: digest(input), credentialEnvelope: sealCredential(password, this.security.credentialKey, id) } });
        await this.audit(tx, input.actorAccountId, account.id, 'EMPLOYEE_ACCOUNT_PREPARED', requestId);
        return safeReceipt(row);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.existing(id, input); if (winner) return winner;
        throw new ConflictException('Email sudah digunakan.');
      }
      throw error;
    }
  }
  async finalize(id: string, input: PrepareAccountDto, requestId?: string) {
    return this.database.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM auth_provisioning WHERE id = ${id} FOR UPDATE`;
      const row = await tx.authProvisioning.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Operasi provisioning tidak ditemukan.');
      if (row.payloadHash !== digest(input)) throw new ConflictException('Operasi provisioning memiliki data berbeda.');
      if (row.finalized) return safeReceipt(row);
      // The signed coordinator confirms its profile transaction is already committed.
      await tx.authAccount.update({ where: { id: row.accountId }, data: { status: input.status } });
      const finalized = await tx.authProvisioning.update({ where: { id }, data: { finalized: true } });
      await this.audit(tx, row.actorAccountId, row.accountId, 'EMPLOYEE_ACCOUNT_FINALIZED', requestId);
      return safeReceipt(finalized);
    });
  }
  async claim(id: string, input: ClaimCredentialDto, authorization?: string, requestId?: string) {
    const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Sesi tidak valid.');
    const session = await this.auth.authenticate(token, false);
    if (session.account.role !== 'ADMIN_HRD') throw new ForbiddenException('Akses hanya untuk admin HRD.');
    // Recovery produces a replacement; the previous password is never revealed again.
    const replacement = input.recover ? randomBytes(24).toString('base64url') : undefined;
    const replacementHash = replacement ? await hash(replacement, 12) : undefined;
    return this.database.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM auth_provisioning WHERE id = ${id} FOR UPDATE`;
      const row = await tx.authProvisioning.findUnique({ where: { id } });
      if (!row || row.actorAccountId !== session.accountId) throw new NotFoundException('Operasi provisioning tidak ditemukan.');
      if (!row.finalized) throw new ConflictException('Profil dan akun belum selesai dibuat.');
      await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${row.accountId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${session.accountId} FOR UPDATE`;
      const currentSession = await tx.authSession.findUnique({ where: { id: session.id }, include: { account: true } });
      if (!currentSession || currentSession.revokedAt || currentSession.expiresAt <= new Date() || currentSession.account.status !== 'ACTIVE' || currentSession.account.mustChangePassword) throw new UnauthorizedException('Sesi tidak valid.');
      const account = await tx.authAccount.findUniqueOrThrow({ where: { id: row.accountId } });
      let password: string;
      if (replacement && replacementHash) {
        if (row.credentialEnvelope || !account.mustChangePassword || account.passwordChangedAt || account.status === 'ARCHIVED') throw new ConflictException('Password sementara tidak dapat dibuat ulang untuk operasi ini.');
        await tx.authAccount.update({ where: { id: account.id }, data: { passwordHash: replacementHash } });
        await tx.authSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
        password = replacement;
      } else {
        if (!row.credentialEnvelope) throw new ConflictException('Password sudah ditampilkan. Gunakan buat pengganti jika respons sebelumnya hilang.');
        password = openCredential(row.credentialEnvelope, this.security.credentialKey, row.id);
      }
      await tx.authProvisioning.update({ where: { id }, data: { credentialEnvelope: null, credentialClaimedAt: new Date() } });
      await this.audit(tx, row.actorAccountId, row.accountId, replacement ? 'PROVISIONING_CREDENTIAL_RECOVERED' : 'PROVISIONING_CREDENTIAL_CLAIMED', requestId);
      return { email: account.email, temporaryPassword: password };
    });
  }
}
