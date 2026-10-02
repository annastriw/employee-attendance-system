import { AttendanceAdminProxyController } from './attendance-admin-proxy.controller';
import {
  MediaProxyController,
  MediaUploadGuard,
} from './media-proxy.controller';
import {
  EmployeesProxyController,
  EmployeeProvisioningProxyController,
  EmployeeEmailChangesProxyController,
  EmployeeLifecycleProxyController,
} from './employee-provisioning-proxy.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayConfig } from './gateway.config';
import { AuthProxyService } from './auth-proxy.service';
import { AuthProxyController } from './auth-proxy.controller';
import { EmployeeProxyController } from './employee-proxy.controller';
import { HolidaysProxyController } from './holidays-proxy.controller';

import { AttendanceProxyController } from './attendance-proxy.controller';
@Module({
  controllers: [
    AppController,
    AuthProxyController,
    EmployeeProxyController,
    EmployeesProxyController,
    EmployeeProvisioningProxyController,
    EmployeeEmailChangesProxyController,
    EmployeeLifecycleProxyController,
    HolidaysProxyController,
    AttendanceProxyController,
    AttendanceAdminProxyController,
    MediaProxyController,
  ],
  providers: [AppService, GatewayConfig, AuthProxyService, MediaUploadGuard],
})
export class AppModule {}
