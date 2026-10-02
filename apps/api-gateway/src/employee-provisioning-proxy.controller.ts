import { BadRequestException, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OPERATION = new RegExp('^/api/v1/employee-provisioning/' + UUID + '(?:/(retry|credentials))?$', 'i');
const KEYS = new Set(['search', 'status', 'page', 'pageSize']);
async function forward(proxy: AuthProxyService, method: 'GET' | 'POST', req: Request, res: Response, operation: boolean) {
  const url = new URL(req.originalUrl, 'http://gateway.local');
  if (operation ? !OPERATION.test(url.pathname) : url.pathname !== '/api/v1/employees') throw new BadRequestException('Request tidak valid.');
  if ((operation || method === 'POST') && url.search) throw new BadRequestException('Request tidak valid.');
  const query = new URLSearchParams();
  for (const [key, value] of url.searchParams) { if (!KEYS.has(key) || query.has(key)) throw new BadRequestException('Request tidak valid.'); query.set(key, value); }
  const headers: Record<string, string> = { 'X-Request-ID': String(res.getHeader('X-Request-ID')) };
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (!operation && method === 'POST') {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new BadRequestException('Request tidak valid.');
    headers['Idempotency-Key'] = key;
  }
  const result = await proxy.forward(url.pathname + (query.size ? '?' + query.toString() : ''), method, headers, method === 'POST' ? req.body : undefined, 'employee');
  res.status(result.status).json(result.payload);
}
@Controller('api/v1/employees')
export class EmployeesProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get() list(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, false); }
  @Post() create(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, false); }
}
@Controller('api/v1/employee-provisioning')
export class EmployeeProvisioningProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get(':id') get(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, true); }
  @Post(':id/:action') action(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, true); }
}
