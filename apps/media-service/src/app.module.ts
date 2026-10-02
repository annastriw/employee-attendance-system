import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediaConfig } from './config/media.config';
import { DatabaseService } from './database/database.service';
import { PhotoStorage } from './storage/photo-storage.service';
import { PhotosService } from './photos/photos.service';
import {
  PhotosController,
  InternalPhotosController,
} from './photos/photos.controller';
import { SessionGuard, EmployeeGuard, InternalGuard } from './auth/media.guard';
import { HealthController } from './health.controller';

@Module({
  controllers: [
    AppController,
    PhotosController,
    InternalPhotosController,
    HealthController,
  ],
  providers: [
    AppService,
    MediaConfig,
    DatabaseService,
    PhotoStorage,
    PhotosService,
    SessionGuard,
    EmployeeGuard,
    InternalGuard,
  ],
})
export class AppModule {}
