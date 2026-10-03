import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EmployeeConfig } from './config/employee.config';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const config = app.get(EmployeeConfig);
  await app.listen(config.port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
