import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { MediaConfig } from './config/media.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(app.get(MediaConfig).port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
