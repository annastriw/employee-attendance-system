import { BadRequestException, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';

// Only these department paths reach Employee Service; anything else is refused
// before a request is built, so the Gateway is never an open proxy.
const DEPARTMENT_PATH =
  /^\/api\/v1\/departments(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/(activate|deactivate))?)?$/i;
const QUERY_KEYS = new Set(['search', 'status', 'page', 'pageSize']);

@Controller('api/v1/departments')
export class EmployeeProxyController {
  constructor(private readonly proxy: AuthProxyService) {}

  private async employee(method: 'GET' | 'POST' | 'PATCH', request: Request, response: Response) {
    const url = new URL(request.originalUrl, 'http://gateway.local');
    if (!DEPARTMENT_PATH.test(url.pathname)) throw new BadRequestException('Request tidak valid.');
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
