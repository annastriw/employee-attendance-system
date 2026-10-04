import type { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { MonitoringProxyController } from './monitoring-proxy.controller';
import type { AuthProxyService } from './auth-proxy.service';

describe('MonitoringProxyController Gateway contract', () => {
  const reqId = '11111111-1111-4111-8111-111111111111';
  const forward = jest.fn();
  const controller = new MonitoringProxyController({
    forward,
  } as unknown as AuthProxyService);

  const req = (path: string) =>
    ({
      originalUrl: '/api/v1/monitoring' + path,
      headers: {
        authorization: 'Bearer admin-token',
        cookie: 'secret-cookie',
        'x-internal-secret': 'secret',
      },
    }) as unknown as Request;

  const res = () => {
    const response = {
      getHeader: () => reqId,
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    return response as unknown as Response;
  };

  beforeEach(() => {
    forward
      .mockReset()
      .mockResolvedValue({ status: 200, payload: { data: { ok: true } } });
  });

  it('forwards /api/v1/monitoring/summary with allowed query params and strips foreign headers', async () => {
    const request = req('/summary?date=2026-10-05');
    await controller.summary(request, res());

    expect(forward).toHaveBeenCalledWith(
      '/api/v1/monitoring/summary?date=2026-10-05',
      'GET',
      {
        authorization: 'Bearer admin-token',
        'X-Request-ID': reqId,
      },
      undefined,
      'attendance',
    );
  });

  it('forwards /api/v1/monitoring/employees with allowed query params', async () => {
    const request = req(
      '/employees?date=2026-10-05&status=MISSING&page=1&pageSize=20',
    );
    await controller.employees(request, res());

    expect(forward).toHaveBeenCalledWith(
      '/api/v1/monitoring/employees?date=2026-10-05&status=MISSING&page=1&pageSize=20',
      'GET',
      {
        authorization: 'Bearer admin-token',
        'X-Request-ID': reqId,
      },
      undefined,
      'attendance',
    );
  });

  it('rejects disallowed query params on summary', async () => {
    const request = req('/summary?unknownParam=true');
    await expect(controller.summary(request, res())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects disallowed query params on employees', async () => {
    const request = req('/employees?fakeParam=123');
    await expect(controller.employees(request, res())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects duplicate query params', async () => {
    const request = req('/summary?date=2026-10-05&date=2026-10-06');
    await expect(controller.summary(request, res())).rejects.toThrow(
      BadRequestException,
    );
  });
});
