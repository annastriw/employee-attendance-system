import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CheckInModule } from '../checkin/checkin.module';
import { PolicyModule } from '../policy/policy.module';
import { AttendanceMonitoringController } from './attendance-monitoring.controller';
import { AttendanceMonitoringService } from './attendance-monitoring.service';

@Module({
  imports: [DatabaseModule, AuthModule, CheckInModule, PolicyModule],
  controllers: [AttendanceMonitoringController],
  providers: [AttendanceMonitoringService],
  exports: [AttendanceMonitoringService],
})
export class AttendanceMonitoringModule {}
