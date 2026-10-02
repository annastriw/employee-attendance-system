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
  checkoutPayloadHash,
  type CheckOutInput,
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
  isEarlyDeparture: event.isEarlyDeparture,
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
    deleteReason: row.deleteReason,
    checkIn: checkIn ? eventResponse(checkIn, !!row.deletedAt) : null,
    checkOut: row.events.find((e) => e.eventType === 'CHECK_OUT')
      ? eventResponse(
          row.events.find((e) => e.eventType === 'CHECK_OUT')!,
          !!row.deletedAt,
        )
      : null,
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
  private async evaluation(
    client: Prisma.TransactionClient,
    at: Date,
    checkoutDate?: string,
  ) {
    const date = TimePolicyEngine.getWibComponents(at).dateString;
    const policy = await client.attWorkPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const holiday = await client.attHoliday.findUnique({
      where: { holidayDate: new Date(date + 'T00:00:00.000Z') },
    });
    // MySQL DATE has no timezone; pass its date string, not a shifted timestamp.
    if (checkoutDate)
      return TimePolicyEngine.evaluateCheckOut(
        at,
        checkoutDate,
        policy ?? DEFAULT_WORK_POLICY,
        holiday
          ? [{ holidayDate: date, description: holiday.description }]
          : [],
      );
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
    const checkoutEvaluation = await this.evaluation(
      this.db.client,
      at,
      evaluation.attendanceDate,
    );
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
        checkoutReasonRequired:
          !!row &&
          !row.deletedAt &&
          !row.events.some((e) => e.eventType === 'CHECK_OUT') &&
          checkoutEvaluation.reasonRequired,
        status: row
          ? row.deletedAt
            ? 'DELETED'
            : row.events.some((e) => e.eventType === 'CHECK_OUT')
              ? 'CHECKED_OUT'
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
        'Absensi sedang diproses. Periksa hasil sebelum mencoba lagi.',
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
    return this.submit(key, input, actor, authorization, requestId, 'CHECK_IN');
  }
  async checkOut(
    key: string,
    input: CheckOutInput,
    actor: SessionProfile,
    authorization: string,
    requestId: string,
  ): Promise<Result> {
    return this.submit(
      key,
      input,
      actor,
      authorization,
      requestId,
      'CHECK_OUT',
    );
  }
  private async submit(
    key: string,
    input: CheckInInput,
    actor: SessionProfile,
    authorization: string,
    requestId: string,
    purpose: 'CHECK_IN' | 'CHECK_OUT',
  ): Promise<Result> {
    const hash =
        purpose === 'CHECK_OUT'
          ? checkoutPayloadHash(input as CheckOutInput)
          : payloadHash(input),
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
          'Absensi sedang diproses. Periksa hasil sebelum mencoba lagi.',
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
        purpose,
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
          let at = this.clock.now();
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
              'Absensi sedang dipulihkan. Periksa hasil terlebih dahulu.',
              409,
            );
          let existingDaily: Daily | null = null;
          if (purpose === 'CHECK_OUT') {
            const targetId = (input as CheckOutInput).dailyRecordId;
            // Lock the owned row to serialize checkout with checkout/delete/restore.
            const locked =
              await tx.$executeRaw(Prisma.sql`UPDATE att_daily_records SET updated_at = GREATEST(${at},
                DATE_ADD(updated_at, INTERVAL 1000 MICROSECOND))
                WHERE id = ${targetId} AND employee_id = ${actor.employeeId!}`);
            if (!locked)
              throw rejection(
                'CHECK_IN_REQUIRED',
                'Catatan check-in milik Anda tidak ditemukan.',
                404,
              );
            existingDaily = await tx.attDailyRecord.findUniqueOrThrow({
              where: { id: targetId },
              include: { events: true },
            });
            if (existingDaily.deletedAt)
              throw rejection(
                'ATTENDANCE_DELETED',
                'Absensi dihapus HRD. Hubungi HRD untuk pemeriksaan.',
                409,
              );
            const checkIn = existingDaily.events.find(
              (e) => e.eventType === 'CHECK_IN',
            );
            if (!checkIn)
              throw rejection(
                'CHECK_IN_REQUIRED',
                'Check-in diperlukan sebelum checkout.',
                409,
              );
            at = this.clock.now();
            if (at.getTime() < checkIn.eventTime.getTime())
              throw rejection(
                'CHECKOUT_BEFORE_CHECKIN',
                'Waktu checkout harus setelah check-in.',
              );
          }
          const evaluation = await this.evaluation(
            tx,
            at,
            existingDaily?.attendanceDate.toISOString().slice(0, 10),
          );
          if ('isCutoffPassed' in evaluation && evaluation.isCutoffPassed)
            throw rejection(
              'CHECKOUT_CUTOFF',
              'Batas checkout tanggal check-in sudah terlewati.',
            );
          if (existingDaily?.events.some((e) => e.eventType === 'CHECK_OUT'))
            throw rejection('CHECKOUT_EXISTS', 'Checkout sudah tercatat.', 409);
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
              purpose === 'CHECK_IN'
                ? 'Isi alasan terlambat untuk melanjutkan check-in.'
                : 'Isi alasan pulang awal untuk melanjutkan checkout.',
            );
          const daily =
            existingDaily ??
            (await tx.attDailyRecord.create({
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
            }));
          const event = await tx.attEvent.create({
            data: {
              dailyRecordId: daily.id,
              eventType: purpose,
              eventTime: at,
              clientCapturedAt: new Date(input.clientCapturedAt),
              captureMethod: input.captureMethod,
              photoObjectId: input.photoObjectId,
              latitude: input.location.latitude,
              longitude: input.location.longitude,
              accuracyMeters: input.location.accuracyMeters,
              locationCapturedAt: new Date(input.location.capturedAt),
              isLate: 'isLate' in evaluation ? evaluation.isLate : false,
              isEarlyDeparture:
                'isEarlyDeparture' in evaluation
                  ? evaluation.isEarlyDeparture
                  : false,
              isOutsideSchedule: evaluation.isOutsideSchedule,
              reason,
              policySnapshot:
                evaluation.policySnapshot as Prisma.InputJsonValue,
            },
          });
          await tx.attAuditLog.create({
            data: {
              actorAccountId: actor.id,
              action:
                purpose === 'CHECK_IN'
                  ? 'CHECK_IN_CREATED'
                  : 'CHECK_OUT_CREATED',
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
              purpose,
              actorAccountId: actor.id,
              requestId,
            },
          });
          const result = this.success(
            recordResponse({
              ...daily,
              events: [...(existingDaily?.events ?? []), event],
            }),
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
          : 'Absensi belum dapat dipastikan. Periksa hasil atau coba lagi.');
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
          'Absensi belum dapat dipastikan. Periksa hasil sebelum mengubah data.',
        );
      return { status, body };
    }
  }
}
