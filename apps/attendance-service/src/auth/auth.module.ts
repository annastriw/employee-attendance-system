import { Module } from '@nestjs/common';
import { AttendanceConfig } from '../config/attendance.config';
import { AdminGuard, AuthClient } from './admin.guard';

import { EmployeeGuard } from './employee.guard';
@Module({
  providers: [AttendanceConfig, AuthClient, AdminGuard, EmployeeGuard],
  exports: [AuthClient, AdminGuard, EmployeeGuard],
})
export class AuthModule {}
