import type { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { AttendanceProxyController } from './attendance-proxy.controller';
import { AuthProxyService } from './auth-proxy.service';
describe('Attendance Gateway boundary', () => {
  const forward = jest.fn();
  const controller = new AttendanceProxyController({
    forward,
  } as unknown as AuthProxyService);
  const key = 'ed1ee3a0-0da2-4529-8694-d5e6e582c063';
  const response = () => {
    const res = { getHeader: () => key, status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  };
  const req = (path: string) =>
    ({
      originalUrl: '/api/v1/me/attendance/' + path,
      body: { photoObjectId: key },
      headers: {
        authorization: 'Bearer test',
        'idempotency-key': key,
        cookie: 'private',
        'x-media-service-key': 'must-not-forward',
      },
    }) as unknown as Request;
  beforeEach(() => {
    forward.mockReset().mockResolvedValue({
      status: 422,
      payload: { error: { code: 'REASON_REQUIRED', message: 'Isi alasan' } },
    });
  });
  it.each(['check-in', 'check-out'])(
    'forwards %s identity, evidence and idempotency only, preserving domain status',
    async (action) => {
      const res = response(),
        request = req(action);
      await (action === 'check-in'
        ? controller.checkIn(request, res as unknown as Response)
        : controller.checkOut(request, res as unknown as Response));
      expect(forward).toHaveBeenCalledWith(
        request.originalUrl,
        'POST',
        {
          authorization: 'Bearer test',
          'Idempotency-Key': key,
          'X-Request-ID': key,
        },
        request.body,
        'attendance',
      );
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'REASON_REQUIRED', message: 'Isi alasan' },
      });
    },
  );
  it.each([
    'today?employeeId=other',
    'requests/not-a-uuid',
    'requests/' + key + '?x=1',
    '../internal/media',
  ])('rejects path/query %s before any upstream call', async (path) => {
    await expect(
      controller.today(req(path), response() as unknown as Response),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(forward).not.toHaveBeenCalled();
  });
  it('forwards a valid scoped reconciliation read without a body', async () => {
    await controller.operation(
      req('requests/' + key),
      response() as unknown as Response,
    );
    expect(forward.mock.calls[0][1]).toBe('GET');
    expect(forward.mock.calls[0][3]).toBeUndefined();
  });
});
