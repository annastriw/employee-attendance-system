import {
  Injectable,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  type AttIdempotencyRequest,
  type AttEvent,
} from '@attendance/database';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { AuthClient, type SessionProfile } from '../auth/admin.guard';
import {
  AttendanceUpstreamClient,
  type EmployeeAttendanceProfile,
} from './attendance-upstream.client';
import {
  DEFAULT_WORK_POLICY,
  TimePolicyEngine,
} from '../policy/time-policy.engine';
import {
  payloadHash,
  validateEvidence,
  rejection,
  ServerClock,
  wib,
  type CheckInInput,
} from './checkin-policy';

type Daily = Prisma.AttDailyRecordGetPayload<{ include: { events: true } }>;
type Result = { status: number; body: Prisma.JsonValue };
const LEASE_MS = 30000;
const eventResponse = (event: AttEvent, deleted: boolean) => ({
  id: event.id,
  eventTime: wib(event.eventTime),
  clientCapturedAt: wib(event.clientCapturedAt),
  isLate: event.isLate,
  isOutsideSchedule: event.isOutsideSchedule,
  captureMethod: event.captureMethod,
  reason: event.reason,
  ...(!deleted ? { photoObjectId: event.photoObjectId } : {}),
  location: {
    latitude: Number(event.latitude),
    longitude: Number(event.longitude),
    accuracyMeters: Number(event.accuracyMeters),
    capturedAt: wib(event.locationCapturedAt),
  },
  policySnapshot: event.policySnapshot,
});
export function recordResponse(row: Daily) {
  const checkIn = row.events.find((e) => e.eventType === 'CHECK_IN');
  return {
    id: row.id,
    attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
    deletedAt: row.deletedAt ? wib(row.deletedAt) : null,
    checkIn: checkIn ? eventResponse(checkIn, !!row.deletedAt) : null,
  };
}
@Injectable()
export class CheckInService {
  constructor(
    private readonly db: DatabaseService,
    private readonly upstream: AttendanceUpstreamClient,
    private readonly auth: AuthClient,
    private readonly clock: ServerClock,
  ) {}
  private success(data: unknown, requestId: string, at: Date) {
    return {
      data,
      meta: { requestId, serverTime: wib(at) },
    } as Prisma.InputJsonValue;
  }
  private eligible(profile: EmployeeAttendanceProfile, date: string) {
    return (
      profile.status === 'ACTIVE' && profile.ready && profile.startDate <= date
    );
  }
  private async evaluation(client: Prisma.TransactionClient, at: Date) {
    const date = TimePolicyEngine.getWibComponents(at).dateString;
    const policy = await client.attWorkPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const holiday = await client.attHoliday.findUnique({
      where: { holidayDate: new Date(date + 'T00:00:00.000Z') },
    });
    // MySQL DATE has no timezone; pass its date string, not a shifted timestamp.
    return TimePolicyEngine.evaluateCheckIn(
      at,
      policy ?? DEFAULT_WORK_POLICY,
      holiday ? [{ holidayDate: date, description: holiday.description }] : [],
    );
  }
  async today(actor: SessionProfile, requestId: string) {
    const at = this.clock.now();
    const profile = await this.upstream.employee(actor.employeeId!, requestId);
    const evaluation = await this.evaluation(this.db.client, at);
    const row = await this.db.client.attDailyRecord.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: actor.employeeId!,
          attendanceDate: new Date(
            evaluation.attendanceDate + 'T00:00:00.000Z',
          ),
        },
      },
      include: { events: true },
    });
    return this.success(
      {
        employeeName: profile.name,
        attendanceDate: evaluation.attendanceDate,
        eligible: this.eligible(profile, evaluation.attendanceDate),
        ineligibilityMessage: this.eligible(profile, evaluation.attendanceDate)
          ? null
          : 'Akun belum memenuhi syarat absensi hari ini.',
        schedule: {
          type: evaluation.scheduleType,
          start: evaluation.policySnapshot.checkInTime,
          end: evaluation.policySnapshot.checkOutTime,
        },
        reasonRequired: evaluation.reasonRequired,
        status: row
          ? row.deletedAt
            ? 'DELETED'
            : 'CHECKED_IN'
          : 'NOT_CHECKED_IN',
        record: row ? recordResponse(row) : null,
      },
      requestId,
      at,
    );
  }
  private replay(row: AttIdempotencyRequest): Result {
    if (!row.responseBody || !row.responseStatus)
      throw rejection(
        'REQUEST_PENDING',
        'Check-in sedang diproses. Periksa hasil sebelum mencoba lagi.',
        409,
      );
    return { status: row.responseStatus, body: row.responseBody };
  }
  async operation(key: string, actor: SessionProfile, requestId: string) {
    const row = await this.db.client.attIdempotencyRequest.findFirst({
      where: { id: key, employeeId: actor.employeeId },
    });
    if (!row)
      throw rejection(
        'REQUEST_NOT_OBSERVED',
        'Permintaan belum teramati. Coba cek hasil lagi atau kirim ulang dengan key yang sama.',
        404,
      );
    return this.success(
      {
        state: row.state,
        responseStatus: row.responseStatus,
        response: row.responseBody,
      },
      requestId,
      this.clock.now(),
    );
  }
  async checkIn(
    key: string,
    input: CheckInInput,
    actor: SessionProfile,
    authorization: string,
    requestId: string,
  ): Promise<Result> {
    const hash = payloadHash(input),
      claimToken = randomUUID(),
      claimedAt = this.clock.now();
    let row: AttIdempotencyRequest;
    try {
      row = await this.db.client.attIdempotencyRequest.create({
        data: {
          id: key,
          employeeId: actor.employeeId!,
          payloadHash: hash,
          state: 'PENDING',
          claimToken,
          leaseUntil: new Date(claimedAt.getTime() + LEASE_MS),
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const existing =
        await this.db.client.attIdempotencyRequest.findUniqueOrThrow({
          where: { id: key },
        });
      if (
        existing.employeeId !== actor.employeeId ||
        existing.payloadHash !== hash
      )
        throw rejection(
          'IDEMPOTENCY_CONFLICT',
          'Idempotency-Key sudah digunakan untuk data berbeda.',
          409,
        );
      if (existing.state === 'SUCCEEDED' || existing.state === 'REJECTED')
        return this.replay(existing);
      const claimed = await this.db.client.attIdempotencyRequest.updateMany({
        where: {
          id: key,
          OR: [
            { state: 'RETRYABLE' },
            { state: 'PENDING', leaseUntil: { lte: claimedAt } },
          ],
        },
        data: {
          state: 'PENDING',
          claimToken,
          leaseUntil: new Date(claimedAt.getTime() + LEASE_MS),
          responseStatus: 0,
          responseBody: Prisma.DbNull,
        },
      });
      if (!claimed.count)
        throw rejection(
          'REQUEST_PENDING',
          'Check-in sedang diproses. Periksa hasil sebelum mencoba lagi.',
          409,
        );
      row = existing;
    }
    try {
      const profile = await this.upstream.employee(
        actor.employeeId!,
        requestId,
      );
      await this.upstream.inspect(
        input.photoObjectId,
        actor.employeeId!,
        requestId,
      );
      const latest = await this.auth.profile(authorization, requestId);
      if (
        latest.id !== actor.id ||
        latest.employeeId !== actor.employeeId ||
        latest.role !== 'EMPLOYEE' ||
        latest.mustChangePassword
      )
        throw rejection(
          'SESSION_CHANGED',
          'Sesi berubah. Silakan masuk kembali.',
          401,
        );
      const body = await this.db.client.$transaction(
        async (tx) => {
          const at = this.clock.now();
          const owned = await tx.attIdempotencyRequest.updateMany({
            where: {
              id: key,
              state: 'PENDING',
              claimToken,
              leaseUntil: { gt: at },
            },
            data: { leaseUntil: new Date(at.getTime() + LEASE_MS) },
          });
          if (!owned.count)
            throw rejection(
              'REQUEST_PENDING',
              'Check-in sedang dipulihkan. Periksa hasil terlebih dahulu.',
              409,
            );
          const evaluation = await this.evaluation(tx, at);
          if (!this.eligible(profile, evaluation.attendanceDate))
            throw rejection(
              'EMPLOYEE_INELIGIBLE',
              'Akun belum memenuhi syarat absensi hari ini.',
              403,
            );
          validateEvidence(input, at);
          const reason = input.reason?.trim() || null;
          if (evaluation.reasonRequired && !reason)
            throw rejection(
              'REASON_REQUIRED',
              'Isi alasan terlambat untuk melanjutkan check-in.',
            );
          const daily = await tx.attDailyRecord.create({
            data: {
              employeeId: actor.employeeId!,
              attendanceDate: new Date(
                evaluation.attendanceDate + 'T00:00:00.000Z',
              ),
              departmentIdSnapshot: profile.department.id,
              departmentNameSnapshot: profile.department.name,
              positionIdSnapshot: profile.position.id,
              positionNameSnapshot: profile.position.name,
            },
          });
          const event = await tx.attEvent.create({
            data: {
              dailyRecordId: daily.id,
              eventType: 'CHECK_IN',
              eventTime: at,
              clientCapturedAt: new Date(input.clientCapturedAt),
              captureMethod: input.captureMethod,
              photoObjectId: input.photoObjectId,
              latitude: input.location.latitude,
              longitude: input.location.longitude,
              accuracyMeters: input.location.accuracyMeters,
              locationCapturedAt: new Date(input.location.capturedAt),
              isLate: evaluation.isLate,
              isOutsideSchedule: evaluation.isOutsideSchedule,
              reason,
              policySnapshot:
                evaluation.policySnapshot as Prisma.InputJsonValue,
            },
          });
          await tx.attAuditLog.create({
            data: {
              actorAccountId: actor.id,
              action: 'CHECK_IN_CREATED',
              entityType: 'ATTENDANCE',
              entityId: daily.id,
              requestId,
              details: { eventId: event.id },
            },
          });
          await tx.attOutbox.create({
            data: {
              eventId: event.id,
              photoObjectId: event.photoObjectId,
              ownerEmployeeId: actor.employeeId!,
              purpose: 'CHECK_IN',
              actorAccountId: actor.id,
              requestId,
            },
          });
          const result = this.success(
            recordResponse({ ...daily, events: [event] }),
            requestId,
            at,
          );
          await tx.attIdempotencyRequest.update({
            where: { id: key },
            data: {
              state: 'SUCCEEDED',
              responseStatus: 201,
              responseBody: result,
              claimToken: null,
              leaseUntil: null,
            },
          });
          return result;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 5000,
        },
      );
      return { status: 201, body: body as Prisma.JsonValue };
    } catch (error) {
      // A transaction response can be lost after commit. Read the durable result before changing its state.
      const current = await this.db.client.attIdempotencyRequest
        .findUnique({ where: { id: row.id } })
        .catch(() => null);
      if (current?.state === 'SUCCEEDED') return this.replay(current);
      let failure = error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const used = await this.db.client.attEvent.findFirst({
          where: { photoObjectId: input.photoObjectId },
        });
        failure = used
          ? rejection(
              'PHOTO_ALREADY_USED',
              'Foto sudah digunakan untuk absensi lain.',
              409,
            )
          : rejection(
              'ATTENDANCE_EXISTS',
              'Absensi tanggal ini sudah tercatat, termasuk yang dihapus HRD.',
              409,
            );
      }
      const status =
        failure instanceof HttpException ? failure.getStatus() : 503;
      const response =
        failure instanceof HttpException ? failure.getResponse() : null;
      const data =
        typeof response === 'object' && response
          ? (response as { code?: string; message?: string })
          : {};
      const code =
        data.code ??
        (status >= 500 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_REJECTED');
      const message =
        data.message ??
        (typeof response === 'string'
          ? response
          : 'Check-in belum dapat dipastikan. Periksa hasil atau coba lagi.');
      const state = status >= 500 ? 'RETRYABLE' : 'REJECTED';
      const body = {
        error: { code, message },
        message,
        statusCode: status,
        requestId,
        meta: { requestId, serverTime: wib(this.clock.now()) },
      };
      const changed = await this.db.client.attIdempotencyRequest
        .updateMany({
          where: { id: key, state: 'PENDING', claimToken },
          data: {
            state,
            responseStatus: status,
            responseBody: body,
            claimToken: null,
            leaseUntil: null,
          },
        })
        .catch(() => null);
      if (!changed?.count)
        throw new ServiceUnavailableException(
          'Check-in belum dapat dipastikan. Periksa hasil sebelum mengubah data.',
        );
      return { status, body };
    }
  }
}
