import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AttendanceConfig } from '../config/attendance.config';

export interface SessionProfile {
  id: string;
  role: 'ADMIN_HRD' | 'EMPLOYEE';
  mustChangePassword: boolean;
}

export interface AttendanceRequest extends Request {
  requestId: string;
  actor?: SessionProfile;
}

/**
 * Validates token ownership against Auth Service /me.
 * This guarantees token revocation, password change mandates, and account deactivation
 * are respected in real-time without Attendance Service reading Auth tables.
 */
@Injectable()
export class AuthClient {
  constructor(private readonly config: AttendanceConfig) {}

  async profile(authorization: string, requestId?: string): Promise<SessionProfile> {
    let response: globalThis.Response;
    try {
      response = await fetch(`${this.config.authUrl}/api/v1/auth/me`, {
        headers: {
          authorization,
          ...(requestId ? { 'X-Request-ID': requestId } : {}),
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
        redirect: 'manual',
      });
    } catch {
      throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    }

    if (response.status === 401) {
      throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    }

    const body = (await response.json().catch(() => null)) as Partial<SessionProfile> | null;
    if (
      !body ||
      typeof body.id !== 'string' ||
      (body.role !== 'ADMIN_HRD' && body.role !== 'EMPLOYEE')
    ) {
      throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    }

    return {
      id: body.id,
      role: body.role,
      mustChangePassword: body.mustChangePassword === true,
    };
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AttendanceRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/i.test(header)) {
      throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    }

    const actor = await this.auth.profile(header, request.requestId);
    if (actor.role !== 'ADMIN_HRD') {
      throw new ForbiddenException('Akses hanya untuk admin HRD.');
    }
    if (actor.mustChangePassword) {
      throw new ForbiddenException('Ganti password awal terlebih dahulu.');
    }

    request.actor = actor;
    return true;
  }
}
