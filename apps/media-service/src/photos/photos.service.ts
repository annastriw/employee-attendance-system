import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  type MediaObject,
  type MediaPurpose,
} from '@attendance/database';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { MediaConfig } from '../config/media.config';
import { PhotoStorage } from '../storage/photo-storage.service';
import type { MediaActor } from '../auth/media.guard';
import { normalizePhoto, sha256 } from './photo-normalizer';
import type { PhotoScopeDto, PhotoBindDto } from './photo.dto';

const response = (row: MediaObject) => ({
  id: row.id,
  status: row.status,
  purpose: row.purpose,
  checksumSha256: row.checksumSha256,
  byteSize: row.byteSize,
  width: row.width,
  height: row.height,
});

@Injectable()
export class PhotosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: MediaConfig,
    private readonly storage: PhotoStorage,
  ) {}

  async upload(
    actor: MediaActor,
    purpose: MediaPurpose,
    key: string,
    file: Express.Multer.File,
    requestId: string,
  ) {
    if (actor.role !== 'EMPLOYEE' || !actor.employeeId)
      throw new ForbiddenException('Upload hanya untuk karyawan.');
    const image = await normalizePhoto(file);
    const requestHash = sha256(
      Buffer.concat([Buffer.from(purpose + '\0'), file.buffer]),
    );
    const claimToken = randomUUID();
    const leaseUntil = new Date(Date.now() + 30_000);
    const id = randomUUID();
    let row: MediaObject;
    try {
      row = await this.db.client.$transaction(async (tx) => {
        const created = await tx.mediaObject.create({
          data: {
            id,
            ownerEmployeeId: actor.employeeId!,
            ownerAccountId: actor.id,
            purpose,
            idempotencyKey: key,
            requestHash,
            checksumSha256: image.checksumSha256,
            bucket: this.config.bucket,
            objectKey: 'attendance/' + actor.employeeId + '/' + id + '.jpg',
            byteSize: image.byteSize,
            width: image.width,
            height: image.height,
            claimToken,
            leaseUntil,
          },
        });
        await tx.mediaAuditLog.create({
          data: {
            actorAccountId: actor.id,
            action: 'UPLOAD_PENDING',
            entityId: id,
            requestId,
          },
        });
        return created;
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const existing = await this.db.client.mediaObject.findUnique({
        where: {
          ownerEmployeeId_idempotencyKey: {
            ownerEmployeeId: actor.employeeId,
            idempotencyKey: key,
          },
        },
      });
      if (!existing)
        throw new ServiceUnavailableException('Upload belum dapat diproses.');
      if (existing.ownerAccountId !== actor.id)
        throw new ForbiddenException('Pemilik foto tidak sesuai.');
      if (existing.requestHash !== requestHash)
        throw new ConflictException(
          'Idempotency-Key sudah digunakan untuk foto berbeda.',
        );
      if (existing.status === 'READY') return response(existing);
      if (existing.checksumSha256 !== image.checksumSha256)
        throw new ConflictException(
          'Normalisasi foto berubah. Gunakan Idempotency-Key baru.',
        );
      const claimed = await this.db.client.mediaObject.updateMany({
        where: {
          id: existing.id,
          OR: [
            { status: 'FAILED' },
            { status: 'PENDING', leaseUntil: { lte: new Date() } },
          ],
        },
        data: { status: 'PENDING', claimToken, leaseUntil },
      });
      if (claimed.count !== 1)
        throw new ConflictException('Upload sedang diproses. Coba kembali.');
      row = { ...existing, status: 'PENDING', claimToken, leaseUntil };
    }

    try {
      // A prior PUT may have completed before its worker or response was lost.
      if (!(await this.storage.matches(row.objectKey, row.checksumSha256)))
        await this.storage.put(row.objectKey, image.bytes);
      if (!(await this.storage.matches(row.objectKey, row.checksumSha256)))
        throw new Error('Stored photo not found');
      await this.db.client.$transaction(async (tx) => {
        const changed = await tx.mediaObject.updateMany({
          where: { id: row.id, status: 'PENDING', claimToken },
          data: {
            status: 'READY',
            readyAt: new Date(),
            claimToken: null,
            leaseUntil: null,
          },
        });
        if (changed.count !== 1)
          throw new ConflictException(
            'Upload sedang dipulihkan. Coba kembali.',
          );
        await tx.mediaAuditLog.create({
          data: {
            actorAccountId: actor.id,
            action: 'UPLOAD_READY',
            entityId: row.id,
            requestId,
          },
        });
      });
      return response({ ...row, status: 'READY' });
    } catch (error) {
      // Never delete an object after an ambiguous storage/transaction timeout.
      await this.db.client
        .$transaction(async (tx) => {
          const failed = await tx.mediaObject.updateMany({
            where: { id: row.id, status: 'PENDING', claimToken },
            data: { status: 'FAILED', claimToken: null, leaseUntil: null },
          });
          if (failed.count)
            await tx.mediaAuditLog.create({
              data: {
                actorAccountId: actor.id,
                action: 'UPLOAD_FAILED',
                entityId: row.id,
                requestId,
              },
            });
        })
        .catch(() => undefined); // Lease permits recovery if MySQL is temporarily unavailable.
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(
        'Penyimpanan foto sementara tidak tersedia. Kirim ulang dengan Idempotency-Key yang sama.',
      );
    }
  }

  private async scoped(id: string, scope: PhotoScopeDto) {
    const row = await this.db.client.mediaObject.findFirst({
      where: {
        id,
        status: 'READY',
        ownerEmployeeId: scope.ownerEmployeeId,
        purpose: scope.purpose,
      },
    });
    if (!row) throw new NotFoundException('Foto siap pakai tidak ditemukan.');
    return row;
  }

  async inspect(id: string, scope: PhotoScopeDto) {
    const row = await this.scoped(id, scope);
    return { ...response(row), boundEventId: row.boundEventId };
  }

  async bind(id: string, scope: PhotoBindDto, requestId: string) {
    try {
      return await this.db.client.$transaction(
        async (tx) => {
          const row = await tx.mediaObject.findFirst({
            where: {
              id,
              status: 'READY',
              ownerEmployeeId: scope.ownerEmployeeId,
              purpose: scope.purpose,
            },
          });
          if (!row)
            throw new NotFoundException('Foto siap pakai tidak ditemukan.');
          if (row.boundEventId && row.boundEventId !== scope.eventId)
            throw new ConflictException(
              'Foto sudah digunakan untuk absensi lain.',
            );
          const changed = await tx.mediaObject.updateMany({
            where: { id, boundEventId: null, status: 'READY' },
            data: { boundEventId: scope.eventId, boundAt: new Date() },
          });
          if (!changed.count) {
            const latest = await tx.mediaObject.findUniqueOrThrow({
              where: { id },
            });
            if (latest.boundEventId !== scope.eventId)
              throw new ConflictException(
                'Foto sudah digunakan untuk absensi lain.',
              );
          } else {
            await tx.mediaAuditLog.create({
              data: {
                actorAccountId: scope.actorAccountId,
                action: 'ATTENDANCE_BOUND',
                entityId: id,
                requestId,
              },
            });
          }
          return { id, status: 'BOUND', eventId: scope.eventId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Event sudah memiliki foto.');
      throw error;
    }
  }

  async photoUrl(
    id: string,
    scope: PhotoScopeDto,
    actor: MediaActor,
    requestId: string,
  ) {
    if (actor.role === 'EMPLOYEE' && actor.employeeId !== scope.ownerEmployeeId)
      throw new ForbiddenException('Foto hanya dapat diakses oleh pemilik.');
    const row = await this.scoped(id, scope);
    const url = await this.storage.signedUrl(row.objectKey);
    await this.db.client.mediaAuditLog.create({
      data: {
        actorAccountId: actor.id,
        action: 'PHOTO_URL_ISSUED',
        entityId: id,
        requestId,
      },
    });
    return { url, expiresInSeconds: 60 };
  }

  async cleanupOrphans(
    options: {
      gracePeriodMs?: number;
      limit?: number;
      actorAccountId?: string;
      requestId?: string;
    } = {},
  ): Promise<{ cleanedCount: number; candidatesFound: number }> {
    const gracePeriodMs = options.gracePeriodMs ?? 2 * 60 * 60 * 1000;
    const limit = Math.min(options.limit ?? 50, 500);
    const now = new Date();
    const cutoff = new Date(now.getTime() - gracePeriodMs);

    const candidates = await this.db.client.mediaObject.findMany({
      where: {
        boundEventId: null,
        status: { in: ['READY', 'FAILED'] },
        createdAt: { lte: cutoff },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let cleanedCount = 0;
    for (const orphan of candidates) {
      await this.storage.delete(orphan.objectKey).catch(() => false);

      const updated = await this.db.client.$transaction(async (tx) => {
        const res = await tx.mediaObject.updateMany({
          where: {
            id: orphan.id,
            boundEventId: null,
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
          },
          data: {
            status: 'FAILED',
            claimToken: null,
            leaseUntil: null,
          },
        });
        if (res.count > 0) {
          await tx.mediaAuditLog.create({
            data: {
              actorAccountId: options.actorAccountId ?? null,
              action: 'PHOTO_ORPHAN_CLEANED',
              entityId: orphan.id,
              requestId: options.requestId ?? randomUUID(),
            },
          });
        }
        return res.count;
      });

      if (updated > 0) {
        cleanedCount++;
      }
    }

    return { cleanedCount, candidatesFound: candidates.length };
  }
}
