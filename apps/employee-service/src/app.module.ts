import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.controller';
import { PositionsModule } from './positions/positions.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DatabaseModule, DepartmentsModule, PositionsModule],
  controllers: [HealthController],
})
export class AppModule {}
