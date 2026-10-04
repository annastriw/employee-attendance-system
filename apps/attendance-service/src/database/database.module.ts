import { Global, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { AttendanceConfig } from '../config/attendance.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client;
  constructor(config: AttendanceConfig) {
    this.client = createDatabaseClient(config.databaseUrl, { caCertificate: config.caCertificate });
  }
  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch {
      throw new Error('Attendance database connection is unavailable. Check runtime configuration.');
    }
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}

@Global()
@Module({
  providers: [AttendanceConfig, DatabaseService],
  exports: [AttendanceConfig, DatabaseService],
})
export class DatabaseModule {}
