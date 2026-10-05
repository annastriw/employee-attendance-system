import type { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { EmployeesProxyController } from './employee-provisioning-proxy.controller';
import type { AuthProxyService } from './auth-proxy.service';

describe('Employee list filter proxy', () => {
  const id = '3b81c559-bfef-11f1-85c7-76e03cd5f3d3';
  const forward = jest.fn();
  const controller = new EmployeesProxyController({ forward } as unknown as AuthProxyService);
  const req = (path: string) => ({ originalUrl: '/api/v1/employees' + path, headers: { authorization: 'Bearer scoped', cookie: 'private' } }) as unknown as Request;
  const res = () => {
    const response = { getHeader: () => 'request-id', status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    return response as unknown as Response;
  };
  beforeEach(() => forward.mockReset().mockResolvedValue({ status: 200, payload: { items: [], total: 0 } }));
  it('forwards combined directory filters, preserving UUIDs and excluding private headers', async () => {
    const request = req('?departmentId=' + id + '&positionId=' + id + '&status=ACTIVE&search=Sari&page=2&pageSize=20');
    await controller.list(request, res());
    expect(forward).toHaveBeenCalledWith(request.originalUrl, 'GET', {
      authorization: 'Bearer scoped', 'X-Request-ID': 'request-id',
    }, undefined, 'employee');
  });
  it.each(['?departmentId=' + id + '&departmentId=' + id, '?unexpected=value'])(
    'rejects duplicate or unknown list parameters %s', async path => {
      await expect(controller.list(req(path), res())).rejects.toBeInstanceOf(BadRequestException);
      expect(forward).not.toHaveBeenCalled();
    },
  );
  it('does not allow directory categories on employee history', async () => {
    await expect(controller.history(req('/' + id + '/history?departmentId=' + id), res())).rejects.toBeInstanceOf(BadRequestException);
    expect(forward).not.toHaveBeenCalled();
  });
});
