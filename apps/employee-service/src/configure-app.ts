import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { EmployeeRequest } from './auth/admin.guard';

@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<EmployeeRequest>();
    const statusCode = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : typeof body === 'string'
          ? body
          : 'Layanan sementara tidak tersedia.';
    response.status(statusCode).json({ statusCode, message, requestId: request.requestId });
  }
}

// Employee Service binds to loopback and is reached only through the Gateway,
// so it exposes no CORS policy of its own.
export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const supplied = request.headers['x-request-id'];
    const requestId = typeof supplied === 'string' && isUUID(supplied) ? supplied : randomUUID();
    (request as EmployeeRequest).requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new SafeExceptionFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Attendance Employee API').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, document);
}
