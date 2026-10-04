import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { PhotoStorage } from './storage/photo-storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: PhotoStorage,
  ) {}
  @Get('live')
  live() {
    return { status: 'ok', service: 'media-service' };
  }
  @Get()
  async ready() {
    try {
      await this.db.client.$queryRaw`SELECT 1`;
      if (!(await this.storage.ready())) throw new Error('Bucket unavailable');
      return {
        status: 'ok',
        service: 'media-service',
        database: 'up',
        storage: 'up',
      };
    } catch {
      throw new ServiceUnavailableException('Media belum siap.');
    }
  }
}
