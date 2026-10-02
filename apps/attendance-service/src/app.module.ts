import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PolicyModule } from './policy/policy.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, PolicyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
