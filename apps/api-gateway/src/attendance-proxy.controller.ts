import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';
@Controller('api/v1/me/attendance')
export class AttendanceProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  private async forward(method: 'GET' | 'POST', req: Request, res: Response) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    const requestPath = url.pathname;
    const operation = requestPath.match(
      /^\/api\/v1\/me\/attendance\/requests\/([^/]+)$/,
    );
    const allowed =
      method === 'GET'
        ? requestPath === '/api/v1/me/attendance/today' ||
          (!!operation && UUID_V4.test(operation[1]))
        : [
            '/api/v1/me/attendance/check-in',
            '/api/v1/me/attendance/check-out',
          ].includes(requestPath);
    if (!allowed || url.search)
      throw new BadRequestException('Request tidak valid.');
    const headers: Record<string, string> = {
      'X-Request-ID': String(res.getHeader('X-Request-ID')),
    };
    if (typeof req.headers.authorization === 'string')
      headers.authorization = req.headers.authorization;
    if (typeof req.headers['idempotency-key'] === 'string')
      headers['Idempotency-Key'] = req.headers['idempotency-key'];
    const result = await this.proxy.forward(
      requestPath,
      method,
      headers,
      method === 'POST' ? req.body : undefined,
      'attendance',
    );
    res.status(result.status).json(result.payload);
  }
  @Get('today') today(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }
  @Get('requests/:key') operation(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }
  @Post('check-in') checkIn(@Req() req: Request, @Res() res: Response) {
    return this.forward('POST', req, res);
  }
  @Post('check-out') checkOut(@Req() req: Request, @Res() res: Response) {
    return this.forward('POST', req, res);
  }
}
