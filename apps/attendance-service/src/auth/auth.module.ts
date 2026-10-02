import { Module } from '@nestjs/common';
import { AttendanceConfig } from '../config/attendance.config';
import { AdminGuard, AuthClient } from './admin.guard';

@Module({
  providers: [AttendanceConfig, AuthClient, AdminGuard],
  exports: [AuthClient, AdminGuard],
})
export class AuthModule {}
