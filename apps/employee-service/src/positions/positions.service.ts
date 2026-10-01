import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type EmpPosition } from '@attendance/database';
import { DatabaseService } from '../database/database.module';
import type { CreatePositionDto, ListPositionsQuery, UpdatePositionDto } from './positions.dto';

type Status = 'ACTIVE' | 'INACTIVE';
interface Actor { accountId: string; requestId?: string }
type Tx = Prisma.TransactionClient;

const view = (position: EmpPosition) => ({
  id: position.id,
  name: position.name,
  code: position.code,
  status: position.status as Status,
  createdAt: position.createdAt.toISOString(),
  updatedAt: position.updatedAt.toISOString(),
});

@Injectable()
export class PositionsService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: ListPositionsQuery) {
    const where: Prisma.EmpPositionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { code: { contains: query.search.toUpperCase() } }] }
        : {}),
    };
    const [items, total] = await this.database.client.$transaction([
      this.database.client.empPosition.findMany({
        where, orderBy: [{ name: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      this.database.client.empPosition.count({ where }),
    ]);
    return { items: items.map(view), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string) {
    return view(await this.find(this.database.client, id));
  }

  create(input: CreatePositionDto, actor: Actor) {
    return this.write(async (tx) => {
      await this.assertUnique(tx, input.name, input.code);
      const created = await tx.empPosition.create({ data: { name: input.name, code: input.code } });
      await this.audit(tx, created.id, 'POSITION_CREATED', actor);
      return view(created);
    });
  }

  update(id: string, input: UpdatePositionDto, actor: Actor) {
    return this.write(async (tx) => {
      const current = await this.find(tx, id);
      const name = input.name ?? current.name;
      const code = input.code ?? current.code;
      if (name === current.name && code === current.code) return view(current);
      await this.assertUnique(tx, name, code, id);
      const updated = await tx.empPosition.update({ where: { id }, data: { name, code } });
      await this.audit(tx, id, 'POSITION_UPDATED', actor);
      return view(updated);
    });
  }

  /** Master data is never hard-deleted; deactivation keeps history intact. */
  setStatus(id: string, status: Status, actor: Actor) {
    return this.write(async (tx) => {
      const current = await this.find(tx, id);
      if (current.status === status) return view(current);
      const updated = await tx.empPosition.update({ where: { id }, data: { status } });
      await this.audit(tx, id, status === 'ACTIVE' ? 'POSITION_ACTIVATED' : 'POSITION_DEACTIVATED', actor);
      return view(updated);
    });
  }

  private async write<T>(work: (tx: Tx) => Promise<T>) {
    try {
      return await this.database.client.$transaction(work);
    } catch (error) {
      // A concurrent insert can still win the race after the pre-check.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama atau kode jabatan sudah digunakan.');
      }
      throw error;
    }
  }

  private async find(client: Tx | DatabaseService['client'], id: string) {
    const position = await client.empPosition.findUnique({ where: { id } });
    if (!position) throw new NotFoundException('Jabatan tidak ditemukan.');
    return position;
  }

  // Collation utf8mb4_unicode_ci makes these comparisons case-insensitive, matching the unique indexes.
  private async assertUnique(tx: Tx, name: string, code: string, exceptId?: string) {
    const clash = await tx.empPosition.findFirst({
      where: { OR: [{ name }, { code }], ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { name: true, code: true },
    });
    if (!clash) return;
    throw new ConflictException(
      clash.code.toLowerCase() === code.toLowerCase() ? 'Kode jabatan sudah digunakan.' : 'Nama jabatan sudah digunakan.',
    );
  }

  private audit(tx: Tx, entityId: string, action: string, actor: Actor) {
    return tx.empAuditLog.create({
      data: { entityType: 'POSITION', entityId, action, actorAccountId: actor.accountId, requestId: actor.requestId },
    });
  }
}
