import { configureApp } from './configure-app';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthConfig } from './config/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const config = app.get(AuthConfig);
  await app.listen(config.port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
