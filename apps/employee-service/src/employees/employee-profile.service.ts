import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type EmpEmployee } from '@attendance/database';
import { DatabaseService } from '../database/database.module';
import type { UpdateEmployeeDto, ListEmployeesQuery } from './employees.dto';
import { emailChangeView } from './email-changes.service';
import { lifecycleView } from './lifecycle.service';
type Actor = { accountId: string; requestId?: string };
const snapshot = (row: EmpEmployee) => ({
  nik: row.nik, name: row.name, phone: row.phone, departmentId: row.departmentId,
  positionId: row.positionId, startDate: row.startDate.toISOString().slice(0, 10), status: row.status,
});

@Injectable()
export class EmployeeProfileService {
  constructor(private readonly database: DatabaseService) {}
  async myProfile(id: string | null) {
    if (!id) return { data: null };
    const row = await this.database.client.empEmployee.findUnique({
      where: { id },
      include: { department: true, position: true, provisioning: true },
    });
    if (!row || !row.ready || row.provisioning?.status !== 'COMPLETED') throw new NotFoundException('Profil karyawan tidak ditemukan.');
    return { data: {
      id: row.id,
      name: row.name,
      nik: row.nik,
      email: row.accountEmail ?? row.provisioning.email,
      phone: row.phone,
      department: row.department.name,
      position: row.position.name,
      startDate: row.startDate.toISOString().slice(0, 10),
      status: row.status,
    } };
  }
  async detail(id: string) {
    const row = await this.database.client.empEmployee.findUnique({
      where: { id }, include: { department: true, position: true, provisioning: true, emailChanges: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 }, lifecycleChanges: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 } },
    });
    if (!row || !row.ready || row.provisioning?.status !== 'COMPLETED') throw new NotFoundException('Karyawan tidak ditemukan.');
    const emailPending = row.emailChanges[0]?.status === 'PENDING';
    const lifecyclePending = row.lifecycleChanges[0]?.status === 'PENDING';
    return { id: row.id, ...snapshot(row), email: row.accountEmail ?? row.provisioning.email,
      department: row.department, position: row.position, updatedAt: row.updatedAt.toISOString(),
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      emailChange: row.emailChanges[0] ? emailChangeView(row.emailChanges[0]) : null,
      lifecycleChange: row.lifecycleChanges[0] ? lifecycleView(row.lifecycleChanges[0]) : null,
      hasPendingOperation: emailPending || lifecyclePending };
  }
  async history(id: string, query: ListEmployeesQuery) {
    const employee = await this.database.client.empEmployee.findUnique({ where: { id } });
    if (!employee || !employee.ready) throw new NotFoundException('Karyawan tidak ditemukan.');
    const where = { employeeId: id };
    const [items, total] = await this.database.client.$transaction([
      this.database.client.empEmployeeHistory.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.database.client.empEmployeeHistory.count({ where }),
    ]);
    return {
      items: items.map(row => ({ id: row.id, action: row.action, before: row.before, after: row.after, actorAccountId: row.actorAccountId, createdAt: row.createdAt.toISOString() })),
      total, page: query.page, pageSize: query.pageSize,
    };
  }
  async update(id: string, input: UpdateEmployeeDto, actor: Actor) {    try {
      await this.database.client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM emp_employees WHERE id = ${id} FOR UPDATE`;
        const row = await tx.empEmployee.findUnique({ where: { id }, include: { provisioning: true } });
        if (!row || !row.ready || row.provisioning?.status !== 'COMPLETED') throw new NotFoundException('Karyawan tidak ditemukan.');
        if (row.status === 'ARCHIVED') throw new ConflictException('Karyawan arsip tidak dapat diedit.');
        if (row.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) throw new ConflictException('Profil berubah. Muat ulang sebelum menyimpan.');
        await tx.$queryRaw`SELECT id FROM emp_departments WHERE id = ${input.departmentId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM emp_positions WHERE id = ${input.positionId} FOR UPDATE`;
        const department = await tx.empDepartment.findUnique({ where: { id: input.departmentId } });
        const position = await tx.empPosition.findUnique({ where: { id: input.positionId } });
        if (!department || (input.departmentId !== row.departmentId && department.status !== 'ACTIVE')) throw new BadRequestException('Pilih departemen aktif.');
        if (!position || (input.positionId !== row.positionId && position.status !== 'ACTIVE')) throw new BadRequestException('Pilih jabatan aktif.');
        const desired = { nik: input.nik, name: input.name, phone: input.phone ?? null, departmentId: input.departmentId, positionId: input.positionId, startDate: new Date(input.startDate + 'T00:00:00Z') };
        const after = { ...snapshot(row), ...desired, startDate: input.startDate };
        if (JSON.stringify(snapshot(row)) === JSON.stringify(after)) return;
        // Ensure optimistic versions advance even when two requests arrive within one millisecond.
        await tx.empEmployee.update({ where: { id }, data: { ...desired, updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) } });
        await tx.empEmployeeHistory.create({ data: { employeeId: id, actorAccountId: actor.accountId, action: 'EMPLOYEE_PROFILE_UPDATED', before: snapshot(row), after, requestId: actor.requestId } });
        await tx.empAuditLog.create({ data: { entityType: 'EMPLOYEE', entityId: id, actorAccountId: actor.accountId, action: 'EMPLOYEE_PROFILE_UPDATED', requestId: actor.requestId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('NIK sudah digunakan.');
      throw error;
    }
    return this.detail(id);
  }
}
