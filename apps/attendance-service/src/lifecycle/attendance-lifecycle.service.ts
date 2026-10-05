import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { DatabaseService } from '../database/database.module';
import { AuthClient, type SessionProfile } from '../auth/admin.guard';
import { AttendanceUpstreamClient } from '../checkin/attendance-upstream.client';
import { recordResponse } from '../checkin/checkin.service';
import { rejection, ServerClock, wib } from '../checkin/checkin-policy';
import type { AttendanceListDto } from './attendance-lifecycle.dto';
type Daily = Prisma.AttDailyRecordGetPayload<{ include: { events: true } }>;
function serialize(row: Daily) {
  return {
    ...recordResponse(row),
    employeeId: row.employeeId,
    version: row.updatedAt.toISOString(),
    department: row.departmentNameSnapshot,
    position: row.positionNameSnapshot,
    deleteReason: row.deleteReason,
    deletedByAccountId: row.deletedByAccountId,
  };
}
@Injectable()
export class AttendanceLifecycleService {
  constructor(
    private readonly db: DatabaseService,
    private readonly upstream: AttendanceUpstreamClient,
    private readonly auth: AuthClient,
    private readonly clock: ServerClock,
  ) {}
  private envelope<T>(data: T, requestId: string) {
    return { data, meta: { requestId, serverTime: wib(this.clock.now()) } };
  }
  async list(query: AttendanceListDto, requestId: string) {
    if (query.startDate && query.endDate && query.startDate > query.endDate)
      throw new BadRequestException(
        'Tanggal awal harus sebelum atau sama dengan tanggal akhir.',
      );
    const where: Prisma.AttDailyRecordWhereInput = {
      deletedAt: query.status === 'DELETED' ? { not: null } : null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.departmentId ? { departmentIdSnapshot: query.departmentId } : {}),
      ...(query.positionId ? { positionIdSnapshot: query.positionId } : {}),
      ...(query.startDate || query.endDate
        ? {
            attendanceDate: {
              ...(query.startDate
                ? { gte: new Date(query.startDate + 'T00:00:00Z') }
                : {}),
              ...(query.endDate
                ? { lte: new Date(query.endDate + 'T00:00:00Z') }
                : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.db.client.$transaction(
      [
        this.db.client.attDailyRecord.findMany({
          where,
          include: { events: true },
          orderBy: [{ attendanceDate: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.client.attDailyRecord.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const ids = [...new Set(rows.map((row) => row.employeeId))];
    // Distinct current profiles through their owning service; at most 20 per page.
    const profiles = new Map(
      await Promise.all(
        ids.map(
          async (id) =>
            [id, await this.upstream.employee(id, requestId)] as const,
        ),
      ),
    );
    const result = this.envelope(
      rows.map((row) => ({
        ...serialize(row),
        employee: {
          id: row.employeeId,
          name: profiles.get(row.employeeId)!.name,
          status: profiles.get(row.employeeId)!.status,
        },
      })),
      requestId,
    );
    return {
      ...result,
      meta: {
        ...result.meta,
        total,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }
  async detail(id: string, requestId: string) {
    const [row, audit] = await this.db.client.$transaction(
      [
        this.db.client.attDailyRecord.findUnique({
          where: { id },
          include: { events: true },
        }),
        this.db.client.attAuditLog.findMany({
          where: {
            entityType: 'DAILY_RECORD',
            entityId: id,
            action: { in: ['ATTENDANCE_DELETED', 'ATTENDANCE_RESTORED'] },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    if (!row)
      throw rejection('ATTENDANCE_NOT_FOUND', 'Absensi tidak ditemukan.', 404);
    const profile = await this.upstream.employee(row.employeeId, requestId);
    return this.envelope(
      {
        ...serialize(row),
        employee: {
          id: profile.id,
          name: profile.name,
          status: profile.status,
        },
        history: audit.map((a) => ({
          id: a.id,
          action: a.action,
          actorAccountId: a.actorAccountId,
          occurredAt: wib(a.createdAt),
          reason: a.reason,
        })),
      },
      requestId,
    );
  }
  async photo(
    id: string,
    eventId: string,
    actor: SessionProfile,
    authorization: string,
    requestId: string,
  ) {
    const current = await this.auth.profile(authorization, requestId);
    if (
      current.id !== actor.id ||
      current.role !== 'ADMIN_HRD' ||
      current.mustChangePassword
    )
      throw new ForbiddenException(
        'Sesi HRD tidak dapat melakukan tindakan ini.',
      );
    const row = await this.db.client.attDailyRecord.findUnique({
      where: { id },
      include: { events: true },
    });
    if (!row)
      throw rejection('ATTENDANCE_NOT_FOUND', 'Absensi tidak ditemukan.', 404);
    const event = row.events.find((e) => e.id === eventId);
    if (!event)
      throw rejection('PHOTO_NOT_FOUND', 'Foto absensi tidak ditemukan.', 404);
    const photo = await this.upstream.photo(
      event.photoObjectId,
      row.employeeId,
      event.eventType,
      authorization,
      requestId,
    );
    return this.envelope(photo, requestId);
  }
  async change(
    id: string,
    version: string,
    reason: string | undefined,
    actor: SessionProfile,
    authorization: string,
    requestId: string,
  ) {
    const current = await this.auth.profile(authorization, requestId);
    if (
      current.id !== actor.id ||
      current.role !== 'ADMIN_HRD' ||
      current.mustChangePassword
    )
      throw new ForbiddenException(
        'Sesi HRD tidak dapat melakukan tindakan ini.',
      );
    const row = await this.db.client.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM att_daily_records WHERE id = ${id} FOR UPDATE`,
        );
        if (!locked.length)
          throw rejection(
            'ATTENDANCE_NOT_FOUND',
            'Absensi tidak ditemukan.',
            404,
          );
        const before = await tx.attDailyRecord.findUniqueOrThrow({
          where: { id },
          include: { events: true },
        });
        const deleting = reason !== undefined;
        if (
          before.updatedAt.toISOString() !== version ||
          deleting === !!before.deletedAt
        )
          throw rejection(
            'ATTENDANCE_CHANGED',
            'Absensi telah berubah. Muat data terbaru dan konfirmasi kembali.',
            409,
          );
        const at = this.clock.now();
        const updatedAt = new Date(
          Math.max(at.getTime(), before.updatedAt.getTime() + 1),
        );
        const updated = await tx.attDailyRecord.update({
          where: { id },
          data: {
            deletedAt: deleting ? at : null,
            deleteReason: reason ?? null,
            deletedByAccountId: deleting ? actor.id : null,
            updatedAt,
          },
          include: { events: true },
        });
        await tx.attAuditLog.create({
          data: {
            actorAccountId: actor.id,
            action: deleting ? 'ATTENDANCE_DELETED' : 'ATTENDANCE_RESTORED',
            entityType: 'DAILY_RECORD',
            entityId: id,
            requestId,
            reason: reason ?? before.deleteReason,
            details: {
              employeeId: before.employeeId,
              attendanceDate: before.attendanceDate.toISOString().slice(0, 10),
              beforeVersion: version,
              afterVersion: updatedAt.toISOString(),
            },
            createdAt: updatedAt,
          },
        });
        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 5000,
      },
    );
    return this.envelope(serialize(row), requestId);
  }
}
