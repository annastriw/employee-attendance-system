import {
  Injectable,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AttendanceConfig } from '../config/attendance.config';
import { rejection } from './checkin-policy';
export interface EmployeeAttendanceProfile {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  ready: boolean;
  startDate: string;
  department: { id: string; name: string };
  position: { id: string; name: string };
}
@Injectable()
export class AttendanceUpstreamClient {
  constructor(private readonly config: AttendanceConfig) {}
  private async call(
    url: string,
    keyHeader: string,
    key: string,
    requestId: string,
    body?: unknown,
  ) {
    try {
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        redirect: 'manual',
        headers: {
          [keyHeader]: key,
          'X-Request-ID': requestId,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 404)
          throw rejection(
            'EVIDENCE_NOT_FOUND',
            'Profil atau foto siap pakai tidak ditemukan.',
            422,
          );
        if (response.status === 409)
          throw rejection(
            'PHOTO_ALREADY_USED',
            'Foto sudah digunakan untuk absensi lain.',
            409,
          );
        throw new Error('Upstream unavailable');
      }
      return payload;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Layanan data karyawan atau foto sementara tidak tersedia.',
      );
    }
  }
  async employee(
    id: string,
    requestId: string,
  ): Promise<EmployeeAttendanceProfile> {
    const p = (await this.call(
      this.config.employeeUrl +
        '/api/v1/internal/employees/' +
        id +
        '/attendance-profile',
      'X-Employee-Service-Key',
      this.config.internalSecret,
      requestId,
    )) as EmployeeAttendanceProfile;
    if (
      !p ||
      p.id !== id ||
      typeof p.name !== 'string' ||
      !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(p.status) ||
      typeof p.ready !== 'boolean' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.startDate) ||
      !isUUID(p.department?.id) ||
      typeof p.department.name !== 'string' ||
      !isUUID(p.position?.id) ||
      typeof p.position.name !== 'string'
    )
      throw new ServiceUnavailableException(
        'Profil karyawan belum dapat diverifikasi.',
      );
    return p;
  }
  async inspect(
    photoId: string,
    employeeId: string,
    requestId: string,
    purpose: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN',
  ) {
    const p = (await this.call(
      this.config.mediaUrl +
        '/api/v1/internal/media/attendance-photos/' +
        photoId +
        '/inspect',
      'X-Media-Service-Key',
      this.config.mediaSecret,
      requestId,
      { ownerEmployeeId: employeeId, purpose },
    )) as {
      id?: string;
      status?: string;
      purpose?: string;
      boundEventId?: string | null;
    };
    if (!p || p.id !== photoId || p.status !== 'READY' || p.purpose !== purpose)
      throw new ServiceUnavailableException('Foto belum dapat diverifikasi.');
    if (p.boundEventId)
      throw rejection(
        'PHOTO_ALREADY_USED',
        'Foto sudah digunakan untuk absensi lain.',
        409,
      );
  }
  async bind(
    photoId: string,
    employeeId: string,
    eventId: string,
    purpose: 'CHECK_IN' | 'CHECK_OUT',
    actorAccountId: string,
    requestId: string,
  ) {
    await this.call(
      this.config.mediaUrl +
        '/api/v1/internal/media/attendance-photos/' +
        photoId +
        '/bind',
      'X-Media-Service-Key',
      this.config.mediaSecret,
      requestId,
      { ownerEmployeeId: employeeId, purpose, eventId, actorAccountId },
    );
  }
}
