import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, type EmpEmailChange } from '@attendance/database';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { EmployeeConfig } from '../config/employee.config';
import { ProvisioningAuthClient } from './provisioning-auth.client';
import type { ChangeEmailDto } from './employees.dto';
type Actor = { accountId: string; requestId?: string };
export const emailChangeView = (row: EmpEmailChange) => ({ id: row.id, employeeId: row.employeeId, email: row.email, status: row.status, errorCode: row.errorCode });
export const employeeEmailHash = (employeeId: string, input: ChangeEmailDto, actorId: string) => createHash('sha256').update(JSON.stringify({ employeeId, actorId, email: input.email, expectedEmail: input.expectedEmail })).digest('hex');
type Receipt = { operationId: string; employeeId: string; email: string };

@Injectable()
export class EmployeeEmailChangesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;
  constructor(private readonly database: DatabaseService, private readonly accounts: ProvisioningAuthClient, private readonly config: EmployeeConfig) {}
  onModuleInit() { if (this.config.workerEnabled) { this.timer = setInterval(() => { void this.tick(); }, 1000); this.timer.unref(); } }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const row = await this.database.client.empEmailChange.findFirst({ where: { status: 'PENDING', nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, orderBy: { nextAttemptAt: 'asc' } });
      if (row) await this.runOne(row.id);
    } catch { /* Durable operation retries; no PII or raw database errors in logs. */ }
    finally { this.ticking = false; }
  }
  private audit(tx: Prisma.TransactionClient, row: EmpEmailChange, action: string) {
    return tx.empAuditLog.create({ data: { entityType: 'EMPLOYEE', entityId: row.employeeId, action, actorAccountId: row.actorAccountId, requestId: row.requestId } });
  }
  private async owned(id: string, actorId: string) {
    const row = await this.database.client.empEmailChange.findUnique({ where: { id } });
    if (!row || row.actorAccountId !== actorId) throw new NotFoundException('Operasi perubahan email tidak ditemukan.');
    return row;
  }
  async operation(id: string, actor: Actor) { return emailChangeView(await this.owned(id, actor.accountId)); }
  async start(id: string, employeeId: string, input: ChangeEmailDto, actor: Actor) {
    if (input.email === input.expectedEmail) throw new BadRequestException('Gunakan email baru yang berbeda.');
    const payloadHash = employeeEmailHash(employeeId, input, actor.accountId);
    const matches = (row: EmpEmailChange) => {
      if (row.actorAccountId !== actor.accountId || row.payloadHash !== payloadHash) throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.');
    };
    try {
      await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM emp_employees WHERE id = ${employeeId} FOR UPDATE`;
        const existing = await tx.empEmailChange.findUnique({ where: { id } });
        if (existing) { matches(existing); return; }
        const employee = await tx.empEmployee.findUnique({ where: { id: employeeId }, include: { provisioning: true } });
        if (!employee || !employee.ready || employee.provisioning?.status !== 'COMPLETED') throw new NotFoundException('Karyawan tidak ditemukan.');
        if (employee.status === 'ARCHIVED') throw new ConflictException('Karyawan arsip tidak dapat diedit.');
        if ((employee.accountEmail ?? employee.provisioning.email) !== input.expectedEmail) throw new ConflictException('Email berubah. Muat ulang sebelum mengubah email.');
        const pending = await tx.empEmailChange.findFirst({ where: { employeeId, status: 'PENDING' } });
        if (pending) throw new ConflictException('Perubahan email sebelumnya masih diproses. Lanjutkan operasi yang sama.');
        const pendingLifecycle = await tx.empLifecycleChange.findFirst({ where: { employeeId, status: 'PENDING' } });
        if (pendingLifecycle) throw new ConflictException('Selesaikan atau pulihkan perubahan status yang masih diproses.');
        const row = await tx.empEmailChange.create({ data: { id, employeeId, actorAccountId: actor.accountId, expectedEmail: input.expectedEmail, email: input.email, payloadHash, requestId: actor.requestId } });
        await this.audit(tx, row, 'EMPLOYEE_EMAIL_CHANGE_REQUESTED');
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.empEmailChange.findUnique({ where: { id } });
        if (!winner) throw new ConflictException('Operasi email sedang diproses. Muat ulang.');
        matches(winner);
      } else throw error;
    }
    await this.runOne(id);
    return this.operation(id, actor);
  }
  async retry(id: string, actor: Actor) {
    const row = await this.owned(id, actor.accountId);
    if (row.status === 'COMPLETED') return emailChangeView(row);
    if (row.status === 'FAILED') throw new ConflictException('Operasi ditolak. Periksa email lalu ajukan perubahan baru.');
    await this.database.client.empEmailChange.updateMany({ where: { id, status: 'PENDING', OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { nextAttemptAt: new Date() } });
    await this.runOne(id);
    return this.operation(id, actor);
  }
  async runOne(id: string) {
    const token = randomUUID();
    const claim = await this.database.client.empEmailChange.updateMany({ where: { id, status: 'PENDING', nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseToken: token, leaseUntil: new Date(Date.now() + 60000) } });
    if (!claim.count) return;
    const row = await this.database.client.empEmailChange.findUniqueOrThrow({ where: { id } });
    try {
      const receipt = await this.accounts.call<Receipt>(id, 'email', { employeeId: row.employeeId, actorAccountId: row.actorAccountId, expectedEmail: row.expectedEmail, email: row.email }, row.requestId ?? undefined);
      if (receipt.operationId !== id || receipt.employeeId !== row.employeeId || receipt.email !== row.email) throw new Error('Invalid email receipt');
      await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM emp_employees WHERE id = ${row.employeeId} FOR UPDATE`;
        const done = await tx.empEmailChange.updateMany({ where: { id, leaseToken: token, status: 'PENDING' }, data: { status: 'COMPLETED', leaseToken: null, leaseUntil: null, errorCode: null } });
        if (!done.count) return;
        const employee = await tx.empEmployee.findUniqueOrThrow({ where: { id: row.employeeId } });
        await tx.empEmployee.update({ where: { id: row.employeeId }, data: { accountEmail: row.email, updatedAt: new Date(Math.max(Date.now(), employee.updatedAt.getTime() + 1)) } });
        await this.audit(tx, row, 'EMPLOYEE_EMAIL_CHANGE_COMPLETED');
      });
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 503;
      const terminal = [400, 403, 404, 409].includes(status);
      // Timeouts/5xx remain pending even after repeated attempts: the Auth commit may already exist.
      await this.database.client.$transaction(async tx => {
        const failed = await tx.empEmailChange.updateMany({ where: { id, leaseToken: token, status: 'PENDING' }, data: { status: terminal ? 'FAILED' : 'PENDING', errorCode: status === 409 ? 'EMAIL_CONFLICT' : terminal ? 'ACCOUNT_REJECTED' : 'AUTH_UNAVAILABLE', attempts: { increment: 1 }, leaseUntil: null, leaseToken: null, nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** Math.min(row.attempts, 6))) } });
        if (failed.count && terminal) await this.audit(tx, row, 'EMPLOYEE_EMAIL_CHANGE_FAILED');
      });
    }
  }
}