import {
  BadRequestException,
  Controller,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';

const SUMMARY_QUERIES = new Set(['date']);
const TREND_QUERIES = new Set(['startDate', 'endDate']);
const EMPLOYEES_QUERIES = new Set([
  'date',
  'departmentId',
  'status',
  'search',
  'page',
  'pageSize',
]);

@Controller('api/v1/monitoring')
export class MonitoringProxyController {
  constructor(private readonly proxy: AuthProxyService) {}

  private async forward(
    req: Request,
    res: Response,
    allowedQueries: Set<string>,
  ) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    const seen = new Set<string>();
    for (const [key] of url.searchParams) {
      if (!allowedQueries.has(key) || seen.has(key)) {
        throw new BadRequestException('Request tidak valid.');
      }
      seen.add(key);
    }

    const headers: Record<string, string> = {
      'X-Request-ID': String(res.getHeader('X-Request-ID')),
    };
    if (typeof req.headers.authorization === 'string') {
      headers.authorization = req.headers.authorization;
    }

    const result = await this.proxy.forward(
      url.pathname + url.search,
      'GET',
      headers,
      undefined,
      'attendance',
    );
    res.status(result.status).json(result.payload);
  }

  @Get('summary')
  summary(@Req() req: Request, @Res() res: Response) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    if (url.pathname !== '/api/v1/monitoring/summary') {
      throw new BadRequestException('Request tidak valid.');
    }
    return this.forward(req, res, SUMMARY_QUERIES);
  }

  @Get('employees')
  employees(@Req() req: Request, @Res() res: Response) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    if (url.pathname !== '/api/v1/monitoring/employees') {
      throw new BadRequestException('Request tidak valid.');
    }
    return this.forward(req, res, EMPLOYEES_QUERIES);
  }

  @Get('trend')
  trend(@Req() req: Request, @Res() res: Response) {
    const url = new URL(req.originalUrl, 'http://gateway.local');
    if (url.pathname !== '/api/v1/monitoring/trend') {
      throw new BadRequestException('Request tidak valid.');
    }
    return this.forward(req, res, TREND_QUERIES);
  }
}
