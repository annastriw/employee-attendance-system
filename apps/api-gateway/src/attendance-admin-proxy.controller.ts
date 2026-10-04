import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';
const UUID =
  '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DETAIL = new RegExp('^/api/v1/attendance/' + UUID + '$', 'i');
const RESTORE = new RegExp('^/api/v1/attendance/' + UUID + '/restore$', 'i');
const PHOTO = new RegExp(
  '^/api/v1/attendance/' + UUID + '/events/' + UUID + '/photo$',
  'i',
);
const QUERIES = new Set([
  'status',
  'startDate',
  'endDate',
  'employeeId',
  'page',
  'pageSize',
]);
@Controller('api/v1/attendance')
export class AttendanceAdminProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  private async forward(
    method: 'GET' | 'DELETE' | 'POST',
    req: Request,
    res: Response,
  ) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    const list = url.pathname === '/api/v1/attendance';
    const allowed =
      method === 'GET'
        ? list || DETAIL.test(url.pathname) || PHOTO.test(url.pathname)
        : method === 'DELETE'
          ? DETAIL.test(url.pathname)
          : RESTORE.test(url.pathname);
    const seen = new Set<string>();
    for (const [key] of url.searchParams) {
      if (!QUERIES.has(key) || seen.has(key))
        throw new BadRequestException('Request tidak valid.');
      seen.add(key);
    }
    if (!allowed || (url.search && !(method === 'GET' && list)))
      throw new BadRequestException('Request tidak valid.');
    const headers: Record<string, string> = {
      'X-Request-ID': String(res.getHeader('X-Request-ID')),
    };
    if (typeof req.headers.authorization === 'string')
      headers.authorization = req.headers.authorization;
    const result = await this.proxy.forward(
      url.pathname + url.search,
      method,
      headers,
      method === 'GET' ? undefined : req.body,
      'attendance',
    );
    res.status(result.status).json(result.payload);
  }
  @Get() list(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }
  @Get(':id/events/:eventId/photo') photo(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.forward('GET', req, res);
  }
  @Get(':id') detail(@Req() req: Request, @Res() res: Response) {
    return this.forward('GET', req, res);
  }
  @Delete(':id') delete(@Req() req: Request, @Res() res: Response) {
    return this.forward('DELETE', req, res);
  }
  @Post(':id/restore') restore(@Req() req: Request, @Res() res: Response) {
    return this.forward('POST', req, res);
  }
}
