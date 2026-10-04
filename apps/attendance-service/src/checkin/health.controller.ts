import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
@Controller('health')
export class AttendanceHealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get('live') live() {
    return { status: 'ok', service: 'attendance-service' };
  }
  @Get() async ready() {
    try {
      await this.db.client.$queryRaw`SELECT 1`;
      const pending = await this.db.client.attOutbox.count({
        where: { state: 'PENDING' },
      });
      const processing = await this.db.client.attOutbox.count({
        where: { state: 'PROCESSING' },
      });
      return {
        ...this.live(),
        database: 'up',
        outbox: { pending, processing },
      };
    } catch {
      throw new ServiceUnavailableException('Database absensi belum tersedia.');
    }
  }
}
