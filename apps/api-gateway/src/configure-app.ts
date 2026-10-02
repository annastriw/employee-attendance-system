import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
  type INestApplication,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { GatewayConfig } from './gateway.config';

@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const parserType =
      typeof error === 'object' && error !== null && 'type' in error
        ? error.type
        : null;
    const statusCode =
      error instanceof HttpException
        ? error.getStatus()
        : parserType === 'entity.too.large'
          ? 413
          : parserType === 'entity.parse.failed'
            ? 400
            : 503;
    const own =
      error instanceof HttpException && statusCode === 503
        ? error.message
        : null;
    const message =
      statusCode === 503
        ? own || 'Layanan sementara tidak tersedia.'
        : statusCode === 413
          ? 'Ukuran request terlalu besar.'
          : statusCode === 400
            ? 'Request tidak valid.'
            : 'Request tidak dapat diproses.';
    response
      .status(statusCode)
      .json({
        statusCode,
        message,
        requestId: response.getHeader('X-Request-ID'),
      });
  }
}
export function configureApp(app: INestApplication) {
  const config = app.get(GatewayConfig);
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const supplied = request.headers['x-request-id'];
    const requestId =
      typeof supplied === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        supplied,
      )
        ? supplied
        : randomUUID();
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    if (
      request.headers.origin &&
      !config.origins.includes(request.headers.origin)
    ) {
      response
        .status(403)
        .json({
          statusCode: 403,
          message: 'Origin tidak diizinkan.',
          requestId,
        });
      return;
    }
    next();
  });
  app.enableCors({
    origin: config.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
  });
  (app as NestExpressApplication).useBodyParser('json', {
    limit: '16kb',
    strict: true,
  });
  app.useGlobalFilters(new SafeExceptionFilter());
}
