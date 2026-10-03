import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { GatewayConfig } from './gateway.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(app.get(GatewayConfig).port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
