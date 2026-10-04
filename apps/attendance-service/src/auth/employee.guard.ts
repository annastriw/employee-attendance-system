import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AuthClient, type AttendanceRequest } from './admin.guard';
@Injectable()
export class EmployeeGuard implements CanActivate {
  constructor(private readonly auth: AuthClient) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AttendanceRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/i.test(header))
      throw new UnauthorizedException('Sesi tidak valid.');
    const actor = await this.auth.profile(header, request.requestId);
    if (
      actor.role !== 'EMPLOYEE' ||
      !actor.employeeId ||
      !isUUID(actor.employeeId)
    )
      throw new ForbiddenException('Akses hanya untuk karyawan.');
    if (actor.mustChangePassword)
      throw new ForbiddenException('Ganti password awal terlebih dahulu.');
    request.actor = actor;
    return true;
  }
}
