import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DatabaseModule, DepartmentsModule],
  controllers: [HealthController],
})
export class AppModule {}
