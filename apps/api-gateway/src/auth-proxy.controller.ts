import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';
import { releaseVersion } from './release-metadata';

@Controller()
export class AuthProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  private async auth(
    path: string,
    method: 'GET' | 'POST',
    request: Request,
    response: Response,
  ) {
    const headers: Record<string, string> = {
      'X-Request-ID': String(response.getHeader('X-Request-ID')),
      'X-Forwarded-For': request.socket.remoteAddress ?? '127.0.0.1',
    };
    for (const name of ['authorization', 'cookie', 'origin']) {
      const value = request.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    const result = await this.proxy.forward(
      `/api/v1/auth/${path}`,
      method,
      headers,
      method === 'POST' ? request.body : undefined,
    );
    if (result.cookies.length) response.setHeader('Set-Cookie', result.cookies);
    if (result.retryAfter) response.setHeader('Retry-After', result.retryAfter);
    response.status(result.status).json(result.payload);
  }
  @Post('api/v1/auth/admin/login')
  adminLogin(@Req() request: Request, @Res() response: Response) {
    return this.auth('admin/login', 'POST', request, response);
  }
  @Post('api/v1/auth/employee/login')
  employeeLogin(@Req() request: Request, @Res() response: Response) {
    return this.auth('employee/login', 'POST', request, response);
  }
  @Post('api/v1/auth/refresh')
  refresh(@Req() request: Request, @Res() response: Response) {
    return this.auth('refresh', 'POST', request, response);
  }
  @Post('api/v1/auth/change-password')
  changePassword(@Req() request: Request, @Res() response: Response) {
    return this.auth('change-password', 'POST', request, response);
  }
  @Post('api/v1/auth/logout')
  logout(@Req() request: Request, @Res() response: Response) {
    return this.auth('logout', 'POST', request, response);
  }
  @Get('api/v1/auth/me')
  me(@Req() request: Request, @Res() response: Response) {
    return this.auth('me', 'GET', request, response);
  }
  @Get('health/live')
  live() {
    return { status: 'ok', service: 'api-gateway' };
  }
  @Get('health')
  async ready() {
    const result = await this.proxy.forward('/health', 'GET');
    if (result.status !== 200)
      throw new ServiceUnavailableException(
        'Layanan autentikasi sementara tidak tersedia.',
      );
    return {
      status: 'ok',
      service: 'api-gateway',
      auth: 'ready',
      release: releaseVersion(),
    };
  }
}
