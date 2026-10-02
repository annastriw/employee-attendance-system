import { AttendanceHistoryController } from '../history/attendance-history.controller';
import { AttendanceHistoryService } from '../history/attendance-history.service';
import { AttendanceLifecycleController } from '../lifecycle/attendance-lifecycle.controller';
import { AttendanceLifecycleService } from '../lifecycle/attendance-lifecycle.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckInController } from './checkin.controller';
import { CheckInService } from './checkin.service';
import { AttendanceUpstreamClient } from './attendance-upstream.client';
import { MediaOutboxWorker } from './media-outbox.worker';
import { ServerClock } from './checkin-policy';
import { AttendanceHealthController } from './health.controller';
@Module({
  imports: [AuthModule],
  controllers: [
    CheckInController,
    AttendanceHealthController,
    AttendanceLifecycleController,
    AttendanceHistoryController,
  ],
  providers: [
    CheckInService,
    AttendanceLifecycleService,
    AttendanceHistoryService,
    AttendanceUpstreamClient,
    MediaOutboxWorker,
    ServerClock,
  ],
})
export class CheckInModule {}
