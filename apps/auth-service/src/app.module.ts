import { AdminSeedService } from './auth/admin-seed.service';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, HealthController],
  providers: [AppService, AdminSeedService],
})
export class AppModule {}
