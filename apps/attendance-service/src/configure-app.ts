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

export interface AttendanceRequest extends Request {
  requestId: string;
  actor?: { id: string; role: string; employeeId?: string };
}

@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<AttendanceRequest>();
    const statusCode = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : typeof body === 'string'
          ? body
          : 'Layanan absensi sementara tidak tersedia.';
    const code =
      typeof body === 'object' &&
      body &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : statusCode === 400
          ? 'VALIDATION_ERROR'
          : statusCode >= 500
            ? 'SERVICE_UNAVAILABLE'
            : 'REQUEST_REJECTED';
    response.status(statusCode).json({
      statusCode,
      message,
      requestId: request.requestId,
      error: { code, message },
      meta: { requestId: request.requestId },
    });
  }
}

export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const supplied = request.headers['x-request-id'];
    const requestId =
      typeof supplied === 'string' && isUUID(supplied)
        ? supplied
        : randomUUID();
    (request as AttendanceRequest).requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live'] });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Attendance Service API')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
