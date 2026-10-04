import {
  type INestApplication,
  ValidationPipe,
  Catch,
  HttpException,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AuthConfig } from './config/auth.config';
import type { AuthRequest } from './auth/session.guard';
@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<AuthRequest>();
    const statusCode = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : typeof body === 'string'
          ? body
          : 'Layanan sementara tidak tersedia.';
    response
      .status(statusCode)
      .json({ statusCode, message, requestId: request.requestId });
  }
}
export function configureApp(app: INestApplication) {
  const config = app.get(AuthConfig);
  // Only the local Gateway may supply client addresses for rate limiting.
  (app as NestExpressApplication).set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const suppliedId = request.headers['x-request-id'];
    const requestId =
      typeof suppliedId === 'string' && isUUID(suppliedId)
        ? suppliedId
        : randomUUID();
    (request as AuthRequest).requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableCors({
    origin: config.origins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
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
      .setTitle('Attendance Auth API')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
