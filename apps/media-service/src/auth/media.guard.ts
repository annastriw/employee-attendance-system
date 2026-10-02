import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { MediaConfig } from '../config/media.config';

export interface MediaActor {
  id: string;
  role: 'EMPLOYEE' | 'ADMIN_HRD';
  employeeId: string | null;
  mustChangePassword: boolean;
}
export interface MediaRequest extends Request {
  requestId: string;
  actor: MediaActor;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly config: MediaConfig) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<MediaRequest>();
    const authorization = request.headers.authorization;
    if (!authorization || !/^Bearer [^\s]+$/i.test(authorization))
      throw new UnauthorizedException('Sesi tidak valid.');
    let actor: MediaActor;
    try {
      const response = await fetch(this.config.authUrl + '/api/v1/auth/me', {
        headers: { authorization, 'X-Request-ID': request.requestId },
        signal: AbortSignal.timeout(this.config.timeoutMs),
        redirect: 'manual',
      });
      if (response.status === 401)
        throw new UnauthorizedException('Sesi tidak valid.');
      if (!response.ok) throw new Error('Auth unavailable');
      actor = (await response.json()) as MediaActor;
      if (
        !actor ||
        !isUUID(actor.id) ||
        !['EMPLOYEE', 'ADMIN_HRD'].includes(actor.role) ||
        typeof actor.mustChangePassword !== 'boolean' ||
        (actor.role === 'EMPLOYEE' && !isUUID(actor.employeeId))
      )
        throw new Error('Invalid profile');
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException(
        'Layanan autentikasi sementara tidak tersedia.',
      );
    }
    if (actor.mustChangePassword)
      throw new ForbiddenException('Ganti password awal terlebih dahulu.');
    request.actor = actor;
    return true;
  }
}

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private readonly config: MediaConfig) {}
  canActivate(context: ExecutionContext) {
    const supplied = context.switchToHttp().getRequest<Request>().headers[
      'x-media-service-key'
    ];
    const expected = Buffer.from(this.config.internalSecret);
    if (
      typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), expected)
    )
      throw new UnauthorizedException('Akses layanan tidak valid.');
    return true;
  }
}

@Injectable()
export class EmployeeGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const actor = context.switchToHttp().getRequest<MediaRequest>().actor;
    if (actor.role !== 'EMPLOYEE' || !actor.employeeId)
      throw new ForbiddenException('Upload hanya untuk karyawan.');
    return true;
  }
}
