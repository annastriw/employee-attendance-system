import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';

// Only /api/v1/holidays and /api/v1/holidays/:uuid reach Attendance Service
const HOLIDAYS_PATH =
  /^\/api\/v1\/holidays(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i;
const QUERY_KEYS = new Set([
  'year',
  'month',
  'startDate',
  'endDate',
  'search',
  'page',
  'pageSize',
]);

@Controller('api/v1/holidays')
export class HolidaysProxyController {
  constructor(private readonly proxy: AuthProxyService) {}

  private async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    request: Request,
    response: Response,
  ) {
    const url = new URL(request.originalUrl, 'http://gateway.local');
    if (!HOLIDAYS_PATH.test(url.pathname)) {
      throw new BadRequestException('Request tidak valid.');
    }
    const query = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (!QUERY_KEYS.has(key) || query.has(key)) {
        throw new BadRequestException('Request tidak valid.');
      }
      query.set(key, value);
    }
    const headers: Record<string, string> = {
      'X-Request-ID': String(response.getHeader('X-Request-ID')),
    };
    if (typeof request.headers.authorization === 'string') {
      headers.authorization = request.headers.authorization;
    }
    const search = query.size ? '?' + query.toString() : '';
    const result = await this.proxy.forward(
      url.pathname + search,
      method,
      headers,
      method === 'GET' || method === 'DELETE' ? undefined : request.body,
      'attendance',
    );
    response.status(result.status).json(result.payload);
  }

  @Get()
  list(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }

  @Post()
  create(@Req() req: Request, @Res() res: Response) {
    return this.forward('POST', req, res);
  }

  @Get(':id')
  get(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }

  @Patch(':id')
  update(@Req() req: Request, @Res() res: Response) {
    return this.forward('PATCH', req, res);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Res() res: Response) {
    return this.forward('DELETE', req, res);
  }
}
