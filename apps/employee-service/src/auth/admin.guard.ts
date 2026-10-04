import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { EmployeeConfig } from '../config/employee.config';

export interface SessionProfile {
  id: string;
  role: 'ADMIN_HRD' | 'EMPLOYEE';
  mustChangePassword: boolean;
  employeeId?: string | null;
}

export interface EmployeeRequest extends Request {
  requestId?: string;
  actor?: SessionProfile;
}

/**
 * Asks Auth Service who owns the bearer token. Auth checks the session row on
 * every call, so logout, expiry and account deactivation are honoured here
 * without Employee reading Auth tables or holding the JWT secret.
 */
@Injectable()
export class AuthClient {
  constructor(private readonly config: EmployeeConfig) {}
  async profile(authorization: string, requestId?: string): Promise<SessionProfile> {
    let response: globalThis.Response;
    try {
      response = await fetch(`${this.config.authUrl}/api/v1/auth/me`, {
        headers: { authorization, ...(requestId ? { 'X-Request-ID': requestId } : {}) },
        signal: AbortSignal.timeout(this.config.timeoutMs),
        redirect: 'manual',
      });
    } catch {
      throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    }
    if (response.status === 401) throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    if (!response.ok) throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    const body = (await response.json().catch(() => null)) as Partial<SessionProfile> | null;
    const employeeId = (body as { employeeId?: unknown } | null)?.employeeId;
    if (!body || typeof body.id !== 'string' || (body.role !== 'ADMIN_HRD' && body.role !== 'EMPLOYEE') ||
      typeof body.mustChangePassword !== 'boolean' ||
      (body.role === 'EMPLOYEE' && typeof employeeId !== 'string') ||
      (employeeId !== null && employeeId !== undefined && typeof employeeId !== 'string')) {
      throw new ServiceUnavailableException('Layanan autentikasi sementara tidak tersedia.');
    }
    return {
      id: body.id,
      role: body.role,
      mustChangePassword: body.mustChangePassword,
      employeeId: typeof employeeId === 'string' ? employeeId : null,
    };
  }
}

@Injectable()
export class UserSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthClient) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<EmployeeRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/i.test(header)) {
      throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    }
    const actor = await this.auth.profile(header, request.requestId);
    if (actor.mustChangePassword) throw new ForbiddenException('Ganti password awal terlebih dahulu.');
    request.actor = actor;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthClient) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<EmployeeRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/i.test(header)) {
      throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    }
    const actor = await this.auth.profile(header, request.requestId);
    if (actor.role !== 'ADMIN_HRD') throw new ForbiddenException('Akses hanya untuk admin HRD.');
    if (actor.mustChangePassword) throw new ForbiddenException('Ganti password awal terlebih dahulu.');
    request.actor = actor;
    return true;
  }
}
