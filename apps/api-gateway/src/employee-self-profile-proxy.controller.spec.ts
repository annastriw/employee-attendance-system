import type { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { AuthProxyService } from './auth-proxy.service';
import { EmployeeSelfProfileProxyController } from './employee-proxy.controller';

describe('Employee self profile Gateway boundary', () => {
  const forward = jest.fn();
  const controller = new EmployeeSelfProfileProxyController({ forward } as unknown as AuthProxyService);
  const req = (url: string) => ({ originalUrl: url, headers: { authorization: 'Bearer session', cookie: 'must-not-forward' } }) as unknown as Request;
  const res = () => {
    const response = { getHeader: () => 'request-1', status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    return response;
  };
  beforeEach(() => forward.mockReset().mockResolvedValue({ status: 200, payload: { data: null } }));

  it('forwards authenticated identity to Employee Service and preserves response status', async () => {
    const response = res();
    await controller.profile(req('/api/v1/me/profile'), response as unknown as Response);
    expect(forward).toHaveBeenCalledWith('/api/v1/me/profile', 'GET', {
      authorization: 'Bearer session', 'X-Request-ID': 'request-1',
    }, undefined, 'employee');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ data: null });
  });

  it.each(['/api/v1/me/profile?x=1', '/api/v1/me/profile/other'])('rejects unapproved path/query %s', async (url) => {
    await expect(controller.profile(req(url), res() as unknown as Response)).rejects.toBeInstanceOf(BadRequestException);
    expect(forward).not.toHaveBeenCalled();
  });
});
