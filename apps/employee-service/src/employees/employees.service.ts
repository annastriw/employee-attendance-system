import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, type EmpProvisioning } from '@attendance/database';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { EmployeeConfig } from '../config/employee.config';
import { ProvisioningAuthClient, type AccountReceipt } from './provisioning-auth.client';
import type { CreateEmployeeDto, ListEmployeesQuery, CredentialRequestDto, RetryEmployeeDto } from './employees.dto';
type Tx = Prisma.TransactionClient;
interface Actor { accountId: string; requestId?: string }
export function employeePayloadHash(input: CreateEmployeeDto) {
  return createHash('sha256').update(JSON.stringify({ nik: input.nik, name: input.name, phone: input.phone ?? null, email: input.email, departmentId: input.departmentId, positionId: input.positionId, startDate: input.startDate, status: input.status })).digest('hex');
}
const operationView = (row: EmpProvisioning) => ({ id: row.id, employeeId: row.employeeId, status: row.status, errorCode: row.errorCode, email: row.email, canCorrectEmail: row.status === 'FAILED' && row.phase === 'PREPARE' && row.errorCode === 'EMAIL_CONFLICT' });
@Injectable()
export class EmployeesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>; private ticking = false;
  constructor(private readonly database: DatabaseService, private readonly accounts: ProvisioningAuthClient, private readonly config: EmployeeConfig) {}
  onModuleInit() { if (this.config.workerEnabled) { this.timer = setInterval(() => { void this.tick(); }, 1000); this.timer.unref(); } }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async tick() {
    if (this.ticking) return; this.ticking = true;
    try {
      const pending = await this.database.client.empProvisioning.findFirst({ where: { status: 'PENDING', nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, orderBy: { nextAttemptAt: 'asc' } });
      if (pending) await this.runOne(pending.id);
    } catch { /* No request payloads, credentials or raw database errors are logged. Durable state retries on the next tick. */ }
    finally { this.ticking = false; }
  }
  private async masters(tx: Tx, departmentId: string, positionId: string) {
    await tx.$queryRaw`SELECT id FROM emp_departments WHERE id = ${departmentId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM emp_positions WHERE id = ${positionId} FOR UPDATE`;
    const [department, position] = await Promise.all([tx.empDepartment.findUnique({ where: { id: departmentId } }), tx.empPosition.findUnique({ where: { id: positionId } })]);
    if (!department || department.status !== 'ACTIVE') throw new BadRequestException('Pilih departemen aktif.');
    if (!position || position.status !== 'ACTIVE') throw new BadRequestException('Pilih jabatan aktif.');
  }
  private audit(tx: Tx, employeeId: string, action: string, actor: Actor) { return tx.empAuditLog.create({ data: { entityType: 'EMPLOYEE', entityId: employeeId, action, actorAccountId: actor.accountId, requestId: actor.requestId } }); }
  async create(id: string, input: CreateEmployeeDto, actor: Actor) {
    const payloadHash = employeePayloadHash(input);
    try {
      await this.database.client.$transaction(async tx => {
        const existing = await tx.empProvisioning.findUnique({ where: { id } });
        if (existing) { if (existing.actorAccountId !== actor.accountId || existing.payloadHash !== payloadHash) throw new ConflictException('Idempotency-Key sudah digunakan untuk data lain.'); return; }
        await this.masters(tx, input.departmentId, input.positionId);
        const employee = await tx.empEmployee.create({ data: { nik: input.nik, name: input.name, phone: input.phone, departmentId: input.departmentId, positionId: input.positionId, startDate: new Date(input.startDate + 'T00:00:00Z') } });
        await tx.empProvisioning.create({ data: { id, employeeId: employee.id, actorAccountId: actor.accountId, requestId: actor.requestId, payloadHash, email: input.email, desiredStatus: input.status } });
        await this.audit(tx, employee.id, 'EMPLOYEE_PROVISIONING_REQUESTED', actor);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.client.empProvisioning.findUnique({ where: { id } });
        if (!winner || winner.actorAccountId !== actor.accountId || winner.payloadHash !== payloadHash) throw new ConflictException('NIK atau Idempotency-Key sudah digunakan.');
      } else throw error;
    }
    await this.runOne(id);
    const row = await this.owned(id, actor.accountId);
    if (row.status === 'FAILED') throw new ConflictException(row.errorCode === 'EMAIL_CONFLICT' ? 'Email sudah digunakan. NIK tetap dicadangkan pada operasi ini.' : 'Pembuatan akun perlu dipulihkan melalui operasi yang sama.');
    return operationView(row);
  }
  private async owned(id: string, actorId: string) {
    const row = await this.database.client.empProvisioning.findUnique({ where: { id } });
    if (!row || row.actorAccountId !== actorId) throw new NotFoundException('Operasi provisioning tidak ditemukan.');
    return row;
  }
  async operation(id: string, actor: Actor) { return operationView(await this.owned(id, actor.accountId)); }
  async retry(id: string, actor: Actor, body: RetryEmployeeDto = {}) {
    const row = await this.owned(id, actor.accountId);
    if (row.status === 'COMPLETED') { if (body.email && body.email !== row.email) throw new BadRequestException('Email akun yang sudah selesai tidak diubah lewat retry.'); return operationView(row); }
    if (body.email) {
      if (row.status !== 'FAILED' || row.phase !== 'PREPARE' || row.errorCode !== 'EMAIL_CONFLICT') throw new BadRequestException('Email hanya dapat diperbaiki setelah prepare gagal karena konflik email.');
      const profile = await this.database.client.empEmployee.findUniqueOrThrow({ where: { id: row.employeeId } });
      const payloadHash = employeePayloadHash({ nik: profile.nik, name: profile.name, phone: profile.phone ?? undefined, email: body.email, departmentId: profile.departmentId, positionId: profile.positionId, startDate: profile.startDate.toISOString().slice(0,10), status: row.desiredStatus as 'ACTIVE' | 'INACTIVE' });
      const changed = await this.database.client.empProvisioning.updateMany({ where: { id, status: 'FAILED', phase: 'PREPARE', payloadHash: row.payloadHash, leaseUntil: null }, data: { email: body.email, payloadHash, errorCode: null } });
      if (!changed.count) throw new ConflictException('Operasi berubah. Muat ulang sebelum memperbaiki email.');
    } else if (row.errorCode === 'EMAIL_CONFLICT') throw new ConflictException('Perbaiki email pada operasi yang sama sebelum melanjutkan.');
    await this.database.client.empProvisioning.updateMany({ where: { id, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { status: 'PENDING', errorCode: null, attempts: 0, nextAttemptAt: new Date() } });
    await this.runOne(id); return this.operation(id, actor);
  }
  async credentials(id: string, body: CredentialRequestDto, actor: Actor, authorization?: string) {
    const row = await this.owned(id, actor.accountId);
    if (row.status !== 'COMPLETED') throw new ConflictException('Profil dan akun belum selesai dibuat.');
    return this.accounts.call<{ email: string; temporaryPassword: string }>(id, 'credentials', body, actor.requestId, authorization);
  }
  async list(query: ListEmployeesQuery) {
    const where: Prisma.EmpEmployeeWhereInput = { ready: true, provisioning: { status: 'COMPLETED' }, ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: [{ name: { contains: query.search } }, { nik: { contains: query.search } }] } : {}) };
    const [items, total] = await this.database.client.$transaction([this.database.client.empEmployee.findMany({ where, include: { department: true, position: true, provisioning: { select: { email: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), this.database.client.empEmployee.count({ where })]);
    return { items: items.map(row => ({ id: row.id, nik: row.nik, name: row.name, phone: row.phone, email: row.provisioning?.email, department: row.department.name, position: row.position.name, startDate: row.startDate.toISOString().slice(0, 10), status: row.status })), total, page: query.page, pageSize: query.pageSize };
  }
  async runOne(id: string) {
    const token = randomUUID(); const now = new Date();
    const claim = await this.database.client.empProvisioning.updateMany({ where: { id, status: 'PENDING', nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseToken: token, leaseUntil: new Date(Date.now() + 60000) } });
    if (!claim.count) return;
    try {
      let row = await this.database.client.empProvisioning.findUniqueOrThrow({ where: { id }, include: { employee: true } });
      const input = { employeeId: row.employeeId, actorAccountId: row.actorAccountId, email: row.email, status: row.desiredStatus };
      if (row.phase === 'PREPARE') {
        const receipt = await this.accounts.call<AccountReceipt>(id, 'prepare', input, row.requestId ?? undefined);
        if (receipt.operationId !== id || !/^[0-9a-f-]{36}$/i.test(receipt.accountId)) throw new Error('Invalid receipt');
        await this.database.client.empProvisioning.updateMany({ where: { id, leaseToken: token }, data: { authAccountId: receipt.accountId, phase: 'PUBLISH' } });
      }
      row = await this.database.client.empProvisioning.findUniqueOrThrow({ where: { id }, include: { employee: true } });
      if (row.phase === 'PUBLISH') {
        await this.database.client.$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM emp_provisioning WHERE id = ${id} FOR UPDATE`;
          const current = await tx.empProvisioning.findUniqueOrThrow({ where: { id } });
          if (current.leaseToken !== token) throw new Error('Lease lost');
          await this.masters(tx, row.employee.departmentId, row.employee.positionId);
          await tx.empEmployee.update({ where: { id: row.employeeId }, data: { ready: true, status: row.desiredStatus } });
          await tx.empProvisioning.update({ where: { id }, data: { phase: 'FINALIZE' } });
        });
      }
      const receipt = await this.accounts.call<AccountReceipt>(id, 'finalize', { ...input, profileReady: true }, row.requestId ?? undefined);
      if (!receipt.finalized || receipt.operationId !== id || receipt.accountId !== row.authAccountId) throw new Error('Invalid final receipt');
      await this.database.client.$transaction(async tx => {
        const done = await tx.empProvisioning.updateMany({ where: { id, leaseToken: token, status: 'PENDING' }, data: { status: 'COMPLETED', leaseUntil: null, leaseToken: null, errorCode: null } });
        if (done.count) await this.audit(tx, row.employeeId, 'EMPLOYEE_PROVISIONING_COMPLETED', { accountId: row.actorAccountId, requestId: row.requestId ?? undefined });
      });
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 503;
      const current = await this.database.client.empProvisioning.findUniqueOrThrow({ where: { id } });
      const terminal = [400, 403, 404, 409].includes(status) || current.attempts >= 7;
      const errorCode = status === 409 ? 'EMAIL_CONFLICT' : status === 400 ? 'MASTER_UNAVAILABLE' : 'AUTH_UNAVAILABLE';
      await this.database.client.$transaction(async tx => {
        const failed = await tx.empProvisioning.updateMany({ where: { id, leaseToken: token }, data: { status: terminal ? 'FAILED' : 'PENDING', attempts: { increment: 1 }, errorCode, leaseUntil: null, leaseToken: null, nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** current.attempts)) } });
        if (failed.count) await this.audit(tx, current.employeeId, terminal ? 'EMPLOYEE_PROVISIONING_FAILED' : 'EMPLOYEE_PROVISIONING_DELAYED', { accountId: current.actorAccountId, requestId: current.requestId ?? undefined });
        // Failure before finalize must not leave a published active profile.
        if (failed.count && terminal && current.phase !== 'FINALIZE') await tx.empEmployee.update({ where: { id: current.employeeId }, data: { ready: false, status: 'INACTIVE' } });
      });
    }
  }
}
