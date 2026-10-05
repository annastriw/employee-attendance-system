import { BadRequestException, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PATHS = {
  employees: new RegExp('^/api/v1/employees(?:/' + UUID + '(?:/email|/lifecycle|/history|/reset-password)?)?$', 'i'),
  provisioning: new RegExp('^/api/v1/employee-provisioning/' + UUID + '(?:/(retry|credentials))?$', 'i'),
  email: new RegExp('^/api/v1/employee-email-changes/' + UUID + '(?:/retry)?$', 'i'),
  lifecycle: new RegExp('^/api/v1/employee-lifecycle/' + UUID + '(?:/retry)?$', 'i'),
};
const KEYS = new Set(['search', 'status', 'page', 'pageSize']);
async function forward(proxy: AuthProxyService, method: 'GET' | 'POST' | 'PATCH', req: Request, res: Response, resource: keyof typeof PATHS) {
  const url = new URL(req.originalUrl, 'http://gateway.local');
  if (!PATHS[resource].test(url.pathname)) throw new BadRequestException('Request tidak valid.');
  const list = resource === 'employees' && method === 'GET' && (url.pathname === '/api/v1/employees' || url.pathname.endsWith('/history'));
  const employeeList = resource === 'employees' && method === 'GET' && url.pathname === '/api/v1/employees';
  if (!list && url.search) throw new BadRequestException('Request tidak valid.');
  const query = new URLSearchParams();
  for (const [key, value] of url.searchParams) { if ((!KEYS.has(key) && !(employeeList && ['departmentId', 'positionId'].includes(key))) || query.has(key)) throw new BadRequestException('Request tidak valid.'); query.set(key, value); }
  const headers: Record<string, string> = { 'X-Request-ID': String(res.getHeader('X-Request-ID')) };
  if (typeof req.headers.authorization === 'string') headers.authorization = req.headers.authorization;
  const needsKey = resource === 'employees' && method === 'POST';
  if (needsKey) {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new BadRequestException('Request tidak valid.');
    headers['Idempotency-Key'] = key;
  }
  const result = await proxy.forward(url.pathname + (query.size ? '?' + query.toString() : ''), method, headers, method === 'GET' ? undefined : req.body, 'employee');
  res.status(result.status).json(result.payload);
}
@Controller('api/v1/employees')
export class EmployeesProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get() list(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'employees'); }
  @Get(':id') detail(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'employees'); }
  @Get(':id/history') history(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'employees'); }
  @Patch(':id') update(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'PATCH', req, res, 'employees'); }
  @Post(':id/email') email(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'employees'); }
  @Post(':id/lifecycle') lifecycle(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'employees'); }
  @Post(':id/reset-password') resetPassword(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'employees'); }
  @Post() create(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'employees'); }
}
@Controller('api/v1/employee-provisioning')
export class EmployeeProvisioningProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get(':id') get(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'provisioning'); }
  @Post(':id/:action') action(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'provisioning'); }
}
@Controller('api/v1/employee-email-changes')
export class EmployeeEmailChangesProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get(':id') get(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'email'); }
  @Post(':id/retry') retry(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'email'); }
}
@Controller('api/v1/employee-lifecycle')
export class EmployeeLifecycleProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Get(':id') get(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'GET', req, res, 'lifecycle'); }
  @Post(':id/retry') retry(@Req() req: Request, @Res() res: Response) { return forward(this.proxy, 'POST', req, res, 'lifecycle'); }
}
