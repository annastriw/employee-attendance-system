import type { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { AttendanceAdminProxyController } from './attendance-admin-proxy.controller';
import type { AuthProxyService } from './auth-proxy.service';
describe('HRD attendance Gateway contract', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const forward = jest.fn();
  const controller = new AttendanceAdminProxyController({
    forward,
  } as unknown as AuthProxyService);
  const req = (path: string) =>
    ({
      originalUrl: '/api/v1/attendance' + path,
      headers: {
        authorization: 'Bearer scoped',
        cookie: 'secret',
        'x-employee-service-key': 'secret',
      },
      body: { version: '2026-10-03T00:00:00.000Z', reason: 'Periksa bukti' },
    }) as unknown as Request;
  const res = () => {
    const response = {
      getHeader: () => id,
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    return response as unknown as Response;
  };
  beforeEach(() =>
    forward
      .mockReset()
      .mockResolvedValue({ status: 200, payload: { data: { id } } }),
  );
  it('retains the JSON reason/version body on DELETE and strips unrelated headers', async () => {
    const request = req('/' + id);
    await controller.delete(request, res());
    expect(forward).toHaveBeenCalledWith(
      request.originalUrl,
      'DELETE',
      {
        authorization: 'Bearer scoped',
        'X-Request-ID': id,
      },
      request.body,
      'attendance',
    );
  });
  it('forwards restoration and paginated deleted reads to Attendance only', async () => {
    await controller.restore(req('/' + id + '/restore'), res());
    expect(forward.mock.calls[0][1]).toBe('POST');
    await controller.list(
      req('?status=DELETED&employeeId=' + id + '&page=2&pageSize=20'),
      res(),
    );
    expect(forward.mock.calls[1][3]).toBeUndefined();
  });
  it('forwards photo request for HRD without query params and strips foreign headers', async () => {
    const eventId = '22222222-2222-4222-8222-222222222222';
    const request = req('/' + id + '/events/' + eventId + '/photo');
    await controller.photo(request, res());
    expect(forward).toHaveBeenCalledWith(
      request.originalUrl,
      'GET',
      {
        authorization: 'Bearer scoped',
        'X-Request-ID': id,
      },
      undefined,
      'attendance',
    );
  });
  it('forwards historical category filters unchanged', async () => {
    const request = req(
      '?departmentId=' + id + '&positionId=' + id + '&page=2',
    );
    await controller.list(request, res());
    expect(forward).toHaveBeenCalledWith(
      request.originalUrl,
      'GET',
      { authorization: 'Bearer scoped', 'X-Request-ID': id },
      undefined,
      'attendance',
    );
  });
  it('accepts valid UUID v5 identifiers for seeded attendance details and photos', async () => {
    const dailyId = 'ee79c983-1129-5776-b94c-768aea5256e4';
    const eventId = '0aa74f9b-8d6e-5fbd-a875-16f38e959f39';

    const detailRequest = req('/' + dailyId);
    await controller.detail(detailRequest, res());
    expect(forward).toHaveBeenCalledWith(
      detailRequest.originalUrl,
      'GET',
      { authorization: 'Bearer scoped', 'X-Request-ID': id },
      undefined,
      'attendance',
    );

    const photoRequest = req('/' + dailyId + '/events/' + eventId + '/photo');
    await controller.photo(photoRequest, res());
    expect(forward).toHaveBeenCalledWith(
      photoRequest.originalUrl,
      'GET',
      { authorization: 'Bearer scoped', 'X-Request-ID': id },
      undefined,
      'attendance',
    );
  });
  it.each([
    '?status=ACTIVE&status=DELETED',
    '?internal=1',
    '/' + id + '?page=1',
    '/not-uuid',
    '/../internal/employees',
    '/' + id + '/restore',
    '/' + id + '/events/not-uuid/photo',
    '/' + id + '/events/' + id + '/photo?foo=bar',
  ])(
    'rejects unsafe GET boundary %s without contacting an upstream',
    async (path) => {
      await expect(controller.list(req(path), res())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(forward).not.toHaveBeenCalled();
    },
  );
});
