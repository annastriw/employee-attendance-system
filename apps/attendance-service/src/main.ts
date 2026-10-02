import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AttendanceConfig } from './config/attendance.config';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const config = app.get(AttendanceConfig);
  await app.listen(config.port, '127.0.0.1');
}
void bootstrap();
