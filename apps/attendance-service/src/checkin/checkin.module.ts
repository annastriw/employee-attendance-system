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
  controllers: [CheckInController, AttendanceHealthController],
  providers: [
    CheckInService,
    AttendanceUpstreamClient,
    MediaOutboxWorker,
    ServerClock,
  ],
})
export class CheckInModule {}
