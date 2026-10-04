import { BadRequestException, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';

// Only these master-data paths reach Employee Service; anything else is refused
// before a request is built, so the Gateway is never an open proxy.
const MASTER_PATH =
  /^\/api\/v1\/(departments|positions)(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/(activate|deactivate))?)?$/i;
const QUERY_KEYS = new Set(['search', 'status', 'page', 'pageSize']);

@Controller(['api/v1/departments', 'api/v1/positions'])
export class EmployeeProxyController {
  constructor(private readonly proxy: AuthProxyService) {}

  private async employee(method: 'GET' | 'POST' | 'PATCH', request: Request, response: Response) {
    const url = new URL(request.originalUrl, 'http://gateway.local');
    if (!MASTER_PATH.test(url.pathname)) throw new BadRequestException('Request tidak valid.');
    const query = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (!QUERY_KEYS.has(key) || query.has(key)) throw new BadRequestException('Request tidak valid.');
      query.set(key, value);
    }
    const headers: Record<string, string> = { 'X-Request-ID': String(response.getHeader('X-Request-ID')) };
    if (typeof request.headers.authorization === 'string') headers.authorization = request.headers.authorization;
    const search = query.size ? '?' + query.toString() : '';
    const result = await this.proxy.forward(url.pathname + search, method, headers,
      method === 'GET' ? undefined : request.body, 'employee');
    response.status(result.status).json(result.payload);
  }

  @Get() list(@Req() req: Request, @Res() res: Response) { return this.employee('GET', req, res); }
  @Post() create(@Req() req: Request, @Res() res: Response) { return this.employee('POST', req, res); }
  @Get(':id') get(@Req() req: Request, @Res() res: Response) { return this.employee('GET', req, res); }
  @Patch(':id') update(@Req() req: Request, @Res() res: Response) { return this.employee('PATCH', req, res); }
  @Post(':id/activate') activate(@Req() req: Request, @Res() res: Response) { return this.employee('POST', req, res); }
  @Post(':id/deactivate') deactivate(@Req() req: Request, @Res() res: Response) { return this.employee('POST', req, res); }
}

@Controller('api/v1/me/profile')
export class EmployeeSelfProfileProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get()
  async profile(@Req() request: Request, @Res() response: Response) {
    const url = new URL(request.originalUrl, 'http://gateway.local');
    if (url.pathname !== '/api/v1/me/profile' || url.search) throw new BadRequestException('Request tidak valid.');
    const headers: Record<string, string> = { 'X-Request-ID': String(response.getHeader('X-Request-ID')) };
    if (typeof request.headers.authorization === 'string') headers.authorization = request.headers.authorization;
    const result = await this.proxy.forward(url.pathname, 'GET', headers, undefined, 'employee');
    response.status(result.status).json(result.payload);
  }
}
