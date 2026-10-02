import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@attendance/database';
import { DatabaseService } from '../database/database.module';
import { AttendanceUpstreamClient } from '../checkin/attendance-upstream.client';
import { ServerClock, rejection, wib } from '../checkin/checkin-policy';
import type { SessionProfile } from '../auth/admin.guard';
import type { AttendanceHistoryQuery } from './attendance-history.dto';
type Daily = Prisma.AttDailyRecordGetPayload<{ include: { events: true } }>;
function serialize(row: Daily, detail = false) {
  const event = (type: 'CHECK_IN' | 'CHECK_OUT') => {
    const e = row.events.find((e) => e.eventType === type);
    if (!e) return null;
    return {
      id: e.id,
      eventTime: wib(e.eventTime),
      reason: e.reason,
      isLate: e.isLate,
      isEarlyDeparture: e.isEarlyDeparture,
      isOutsideSchedule: e.isOutsideSchedule,
      ...(detail
        ? {
            captureMethod: e.captureMethod,
            location: {
              latitude: Number(e.latitude),
              longitude: Number(e.longitude),
              accuracyMeters: Number(e.accuracyMeters),
              capturedAt: wib(e.locationCapturedAt),
            },
            policySnapshot: e.policySnapshot,
          }
        : {}),
    };
  };
  return {
    id: row.id,
    attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
    department: row.departmentNameSnapshot,
    position: row.positionNameSnapshot,
    deletedAt: row.deletedAt ? wib(row.deletedAt) : null,
    deleteReason: row.deleteReason,
    checkIn: event('CHECK_IN'),
    checkOut: event('CHECK_OUT'),
  };
}
@Injectable()
export class AttendanceHistoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly upstream: AttendanceUpstreamClient,
    private readonly clock: ServerClock,
  ) {}
  private envelope<T>(data: T, requestId: string) {
    return { data, meta: { requestId, serverTime: wib(this.clock.now()) } };
  }
  async list(
    query: AttendanceHistoryQuery,
    actor: SessionProfile,
    requestId: string,
  ) {
    if (query.startDate && query.endDate && query.startDate > query.endDate)
      throw new BadRequestException(
        'Tanggal awal harus sebelum atau sama dengan tanggal akhir.',
      );
    const where: Prisma.AttDailyRecordWhereInput = {
      employeeId: actor.employeeId!,
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
    const result = this.envelope(
      rows.map((row) => serialize(row)),
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
  private async owned(id: string, actor: SessionProfile) {
    const row = await this.db.client.attDailyRecord.findFirst({
      where: { id, employeeId: actor.employeeId! },
      include: { events: true },
    });
    if (!row)
      throw rejection('ATTENDANCE_NOT_FOUND', 'Absensi tidak ditemukan.', 404);
    return row;
  }
  async detail(id: string, actor: SessionProfile, requestId: string) {
    return this.envelope(
      serialize(await this.owned(id, actor), true),
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
    const row = await this.owned(id, actor);
    const event = row.events.find((e) => e.id === eventId);
    if (!event)
      throw rejection('PHOTO_NOT_FOUND', 'Foto absensi tidak ditemukan.', 404);
    if (row.deletedAt)
      throw rejection(
        'ATTENDANCE_DELETED',
        'Foto absensi yang dihapus HRD disembunyikan.',
        409,
      );
    const photo = await this.upstream.photo(
      event.photoObjectId,
      row.employeeId,
      event.eventType,
      authorization,
      requestId,
    );
    const latest = await this.db.client.attDailyRecord.findFirst({
      where: { id, employeeId: actor.employeeId! },
    });
    if (
      !latest ||
      latest.deletedAt ||
      latest.updatedAt.getTime() !== row.updatedAt.getTime()
    )
      throw rejection(
        'ATTENDANCE_CHANGED',
        'Absensi telah berubah. Muat detail terbaru.',
        409,
      );
    return this.envelope(photo, requestId);
  }
}
