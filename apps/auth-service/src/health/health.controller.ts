import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseService } from '../database/database.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get('live')
  live() { return { status: 'ok', service: 'auth-service' }; }
  @Get()
  async ready() {
    try {
      await this.database.client.$queryRaw`SELECT 1 AS ready`;
      return { status: 'ok', service: 'auth-service', database: 'up' };
    } catch { throw new ServiceUnavailableException('Database is unavailable.'); }
  }
}
