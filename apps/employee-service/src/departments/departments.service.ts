import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type EmpDepartment } from '@attendance/database';
import { DatabaseService } from '../database/database.module';
import type { CreateDepartmentDto, ListDepartmentsQuery, UpdateDepartmentDto } from './departments.dto';

type Status = 'ACTIVE' | 'INACTIVE';
interface Actor { accountId: string; requestId?: string }
type Tx = Prisma.TransactionClient;

const view = (department: EmpDepartment) => ({
  id: department.id,
  name: department.name,
  code: department.code,
  status: department.status as Status,
  createdAt: department.createdAt.toISOString(),
  updatedAt: department.updatedAt.toISOString(),
});

@Injectable()
export class DepartmentsService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: ListDepartmentsQuery) {
    const where: Prisma.EmpDepartmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { code: { contains: query.search.toUpperCase() } }] }
        : {}),
    };
    const [items, total] = await this.database.client.$transaction([
      this.database.client.empDepartment.findMany({
        where, orderBy: [{ name: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      this.database.client.empDepartment.count({ where }),
    ]);
    return { items: items.map(view), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string) {
    return view(await this.find(this.database.client, id));
  }

  create(input: CreateDepartmentDto, actor: Actor) {
    return this.write(async (tx) => {
      await this.assertUnique(tx, input.name, input.code);
      const created = await tx.empDepartment.create({ data: { name: input.name, code: input.code } });
      await this.audit(tx, created.id, 'DEPARTMENT_CREATED', actor);
      return view(created);
    });
  }

  update(id: string, input: UpdateDepartmentDto, actor: Actor) {
    return this.write(async (tx) => {
      const current = await this.find(tx, id);
      const name = input.name ?? current.name;
      const code = input.code ?? current.code;
      if (name === current.name && code === current.code) return view(current);
      await this.assertUnique(tx, name, code, id);
      const updated = await tx.empDepartment.update({ where: { id }, data: { name, code } });
      await this.audit(tx, id, 'DEPARTMENT_UPDATED', actor);
      return view(updated);
    });
  }

  /** Master data is never hard-deleted; deactivation keeps history intact. */
  setStatus(id: string, status: Status, actor: Actor) {
    return this.write(async (tx) => {
      const current = await this.find(tx, id);
      if (current.status === status) return view(current);
      const updated = await tx.empDepartment.update({ where: { id }, data: { status } });
      await this.audit(tx, id, status === 'ACTIVE' ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED', actor);
      return view(updated);
    });
  }

  private async write<T>(work: (tx: Tx) => Promise<T>) {
    try {
      return await this.database.client.$transaction(work);
    } catch (error) {
      // A concurrent insert can still win the race after the pre-check.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama atau kode departemen sudah digunakan.');
      }
      throw error;
    }
  }

  private async find(client: Tx | DatabaseService['client'], id: string) {
    const department = await client.empDepartment.findUnique({ where: { id } });
    if (!department) throw new NotFoundException('Departemen tidak ditemukan.');
    return department;
  }

  // Collation utf8mb4_unicode_ci makes these comparisons case-insensitive, matching the unique indexes.
  private async assertUnique(tx: Tx, name: string, code: string, exceptId?: string) {
    const clash = await tx.empDepartment.findFirst({
      where: { OR: [{ name }, { code }], ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { name: true, code: true },
    });
    if (!clash) return;
    throw new ConflictException(
      clash.code.toLowerCase() === code.toLowerCase() ? 'Kode departemen sudah digunakan.' : 'Nama departemen sudah digunakan.',
    );
  }

  private audit(tx: Tx, entityId: string, action: string, actor: Actor) {
    return tx.empAuditLog.create({
      data: { entityType: 'DEPARTMENT', entityId, action, actorAccountId: actor.accountId, requestId: actor.requestId },
    });
  }
}
