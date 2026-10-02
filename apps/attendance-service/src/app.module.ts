import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PolicyModule } from './policy/policy.module';
import { AuthModule } from './auth/auth.module';
import { HolidaysModule } from './holidays/holidays.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CheckInModule } from './checkin/checkin.module';
import { AttendanceMonitoringModule } from './monitoring/attendance-monitoring.module';
@Module({
  imports: [
    DatabaseModule,
    PolicyModule,
    AuthModule,
    HolidaysModule,
    CheckInModule,
    AttendanceMonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
