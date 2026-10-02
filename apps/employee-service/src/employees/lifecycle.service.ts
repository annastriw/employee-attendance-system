import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, type EmpLifecycleChange, type EmpEmployeeStatus } from '@attendance/database';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { EmployeeConfig } from '../config/employee.config';
import { ProvisioningAuthClient } from './provisioning-auth.client';
import type { ChangeLifecycleDto } from './employees.dto';

type Actor = { accountId: string; requestId?: string };
type Receipt = { operationId: string; employeeId: string; status: EmpEmployeeStatus; accountId: string };

// Allowed source statuses per target. restore (ARCHIVED->INACTIVE) never lands ACTIVE directly.
const ALLOWED_FROM: Record<EmpEmployeeStatus, EmpEmployeeStatus[]> = {
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'INACTIVE'],
};

export const lifecycleView = (row: EmpLifecycleChange) => ({ id: row.id, employeeId: row.employeeId, targetStatus: row.targetStatus, status: row.status, errorCode: row.errorCode });
export const lifecycleHash = (employeeId: string, input: ChangeLifecycleDto, actorId: string) =>
  createHash('sha256').update(JSON.stringify({ employeeId, actorId, expectedStatus: input.expectedStatus, targetStatus: input.targetStatus })).digest('hex');

@Injectable()
export class EmployeeLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;
  constructor(private readonly database: DatabaseService, private readonly accounts: ProvisioningAuthClient, private readonly config: EmployeeConfig) {}
  onModuleInit() { if (this.config.workerEnabled) { this.timer = setInterval(() => { void this.tick(); }, 1000); this.timer.unref(); } }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const row = await this.database.client.empLifecycleChange.findFirst({ where: { status: 'PENDING', nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, orderBy: { nextAttemptAt: 'asc' } });
      if (row) await this.runOne(row.id);
    } catch { /* Durable operation retries; no PII or raw database errors in logs. */ }
    finally { this.ticking = false; }
  }
  private audit(tx: Prisma.TransactionClient, row: EmpLifecycleChange, action: string) {
    return tx.empAuditLog.create({ data: { entityType: 'EMPLOYEE', entityId: row.employeeId, action, actorAccountId: row.actorAccountId, requestId: row.requestId } });
  }
  private async owned(id: string, actorId: string) {
    const row = await this.database.client.empLifecycleChange.findUnique({ where: { id } });
    if (!row || row.actorAccountId !== actorId) throw new NotFoundException('Operasi perubahan status tidak ditemukan.');
    return row;
  }
  async operation(id: string, actor: Actor) { return lifecycleView(await this.owned(id, actor.accountId)); }

  async start(id: string, employeeId: string, input: ChangeLifecycleDto, actor: Actor) {
    if (input.expectedStatus === input.targetStatus) throw new BadRequestException('Status tujuan harus berbeda.');
    if (!ALLOWED_FROM[input.targetStatus].includes(input.expectedStatus)) throw new BadRequestException('Transisi status tidak diizinkan.');
    const payloadHash = lifecycleHash(employeeId, input, actor.accountId);
    const matches = (row: EmpLifecycleChange) => {
      if (row.actorAccountId !== actor.accountId || row.payloadHash !== payloadHash) throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.');
    };
    try {
      await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM emp_employees WHERE id = ${employeeId} FOR UPDATE`;
        const existing = await tx.empLifecycleChange.findUnique({ where: { id } });
        if (existing) { matches(existing); return; }
        const employee = await tx.empEmployee.findUnique({ where: { id: employeeId }, include: { provisioning: true } });
        if (!employee || !employee.ready || employee.provisioning?.status !== 'COMPLETED') throw new NotFoundException('Karyawan tidak ditemukan.');
        if (employee.status !== input.expectedStatus) throw new ConflictException('Status berubah. Muat ulang sebelum mengubah status.');
        // Lifecycle and email ops are mutually exclusive per employee: both revoke sessions / touch the Auth account.
        const pendingEmail = await tx.empEmailChange.findFirst({ where: { employeeId, status: 'PENDING' } });
        if (pendingEmail) throw new ConflictException('Selesaikan atau pulihkan perubahan email yang masih diproses.');
        const pendingLifecycle = await tx.empLifecycleChange.findFirst({ where: { employeeId, status: 'PENDING' } });
        if (pendingLifecycle) throw new ConflictException('Perubahan status sebelumnya masih diproses. Lanjutkan operasi yang sama.');
        const row = await tx.empLifecycleChange.create({ data: { id, employeeId, actorAccountId: actor.accountId, expectedStatus: input.expectedStatus, targetStatus: input.targetStatus, payloadHash, requestId: actor.requestId } });
        await this.audit(tx, row, 'EMPLOYEE_LIFECYCLE_REQUESTED');
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.empLifecycleChange.findUnique({ where: { id } });
        if (!winner) throw new ConflictException('Operasi status sedang diproses. Muat ulang.');
        matches(winner);
      } else throw error;
    }
    await this.runOne(id);
    return this.operation(id, actor);
  }

  async retry(id: string, actor: Actor) {
    const row = await this.owned(id, actor.accountId);
    if (row.status === 'COMPLETED') return lifecycleView(row);
    if (row.status === 'FAILED') throw new ConflictException('Operasi ditolak. Muat ulang status lalu ajukan perubahan baru.');
    await this.database.client.empLifecycleChange.updateMany({ where: { id, status: 'PENDING', OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { nextAttemptAt: new Date() } });
    await this.runOne(id);
    return this.operation(id, actor);
  }

  async runOne(id: string) {
    const token = randomUUID();
    const claim = await this.database.client.empLifecycleChange.updateMany({ where: { id, status: 'PENDING', nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseToken: token, leaseUntil: new Date(Date.now() + 60000) } });
    if (!claim.count) return;
    const row = await this.database.client.empLifecycleChange.findUniqueOrThrow({ where: { id } });
    try {
      const receipt = await this.accounts.call<Receipt>(id, 'lifecycle', { employeeId: row.employeeId, actorAccountId: row.actorAccountId, expectedStatus: row.expectedStatus, targetStatus: row.targetStatus }, row.requestId ?? undefined);
      if (receipt.operationId !== id || receipt.employeeId !== row.employeeId || receipt.status !== row.targetStatus) throw new Error('Invalid lifecycle receipt');
      await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM emp_employees WHERE id = ${row.employeeId} FOR UPDATE`;
        const done = await tx.empLifecycleChange.updateMany({ where: { id, leaseToken: token, status: 'PENDING' }, data: { status: 'COMPLETED', leaseToken: null, leaseUntil: null, errorCode: null } });
        if (!done.count) return;
        const employee = await tx.empEmployee.findUniqueOrThrow({ where: { id: row.employeeId } });
        const before = { status: employee.status };
        await tx.empEmployee.update({ where: { id: row.employeeId }, data: { status: row.targetStatus, archivedAt: row.targetStatus === 'ARCHIVED' ? new Date() : null, updatedAt: new Date(Math.max(Date.now(), employee.updatedAt.getTime() + 1)) } });
        await tx.empEmployeeHistory.create({ data: { employeeId: row.employeeId, actorAccountId: row.actorAccountId, action: 'EMPLOYEE_LIFECYCLE_' + row.targetStatus, before, after: { status: row.targetStatus }, requestId: row.requestId } });
        await this.audit(tx, row, 'EMPLOYEE_LIFECYCLE_' + row.targetStatus + '_COMPLETED');
      });
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 503;
      const terminal = [400, 403, 404, 409].includes(status);
      // Timeouts/5xx remain pending even after repeated attempts: the Auth commit may already exist.
      await this.database.client.$transaction(async tx => {
        const failed = await tx.empLifecycleChange.updateMany({ where: { id, leaseToken: token, status: 'PENDING' }, data: { status: terminal ? 'FAILED' : 'PENDING', errorCode: status === 409 ? 'STATUS_CONFLICT' : terminal ? 'ACCOUNT_REJECTED' : 'AUTH_UNAVAILABLE', attempts: { increment: 1 }, leaseUntil: null, leaseToken: null, nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** Math.min(row.attempts, 6))) } });
        if (failed.count && terminal) await this.audit(tx, row, 'EMPLOYEE_LIFECYCLE_FAILED');
      });
    }
  }
}
