import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type CurrentSession } from './auth.service';
export interface AuthRequest extends Request {
  authSession?: CurrentSession;
  requestId?: string;
}
export const AllowRestrictedSession = () =>
  SetMetadata('allowRestrictedSession', true);
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = request.headers.authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match)
      throw new UnauthorizedException(
        'Sesi tidak valid. Silakan login kembali.',
      );
    const allowRestricted =
      this.reflector.getAllAndOverride<boolean>('allowRestrictedSession', [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    request.authSession = await this.auth.authenticate(
      match[1],
      allowRestricted,
    );
    return true;
  }
}
