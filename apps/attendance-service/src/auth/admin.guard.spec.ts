import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { AdminGuard, AuthClient, type SessionProfile } from './admin.guard';
import type { AttendanceConfig } from '../config/attendance.config';

const config = {
  authUrl: 'http://127.0.0.1:3001',
  timeoutMs: 1000,
} as unknown as AttendanceConfig;

const reply = (status: number, body: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe('AuthClient in Attendance Service', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the profile Auth reports for a live session', async () => {
    const fetch = reply(200, {
      id: 'a',
      role: 'ADMIN_HRD',
      mustChangePassword: false,
      email: 'hr@example.invalid',
    });
    await expect(new AuthClient(config).profile('Bearer t', 'rid')).resolves.toEqual({
      id: 'a',
      role: 'ADMIN_HRD',
      mustChangePassword: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/v1/auth/me',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('treats a revoked or expired session (401) as unauthenticated', async () => {
    reply(401, { message: 'Sesi tidak valid.' });
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps Auth outages and malformed bodies to 503, never to access', async () => {
    reply(500, {});
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    reply(200, { role: 'ADMIN_HRD' });
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('AdminGuard in Attendance Service', () => {
  const context = (authorization?: string) => {
    const request: Record<string, unknown> = {
      headers: authorization ? { authorization } : {},
    };
    return {
      request,
      ctx: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  };

  const guard = (profile: SessionProfile) =>
    new AdminGuard({
      profile: () => Promise.resolve(profile),
    } as unknown as AuthClient);

  it('requires a bearer header', async () => {
    await expect(
      guard({ id: 'a', role: 'ADMIN_HRD', mustChangePassword: false }).canActivate(
        context().ctx,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows only HR admins who completed the initial password change', async () => {
    const ok = context('Bearer t');
    await expect(
      guard({ id: 'a', role: 'ADMIN_HRD', mustChangePassword: false }).canActivate(ok.ctx),
    ).resolves.toBe(true);
    expect(ok.request.actor).toMatchObject({ id: 'a' });

    await expect(
      guard({ id: 'b', role: 'EMPLOYEE', mustChangePassword: false }).canActivate(
        context('Bearer t').ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      guard({ id: 'c', role: 'ADMIN_HRD', mustChangePassword: true }).canActivate(
        context('Bearer t').ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
