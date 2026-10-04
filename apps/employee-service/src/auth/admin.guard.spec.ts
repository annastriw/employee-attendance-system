import { ForbiddenException, ServiceUnavailableException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard, AuthClient, UserSessionGuard, type SessionProfile } from './admin.guard';
import type { EmployeeConfig } from '../config/employee.config';

const config = { authUrl: 'http://127.0.0.1:3001', timeoutMs: 1000 } as unknown as EmployeeConfig;
const reply = (status: number, body: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('AuthClient', () => {
  afterEach(() => jest.restoreAllMocks());
  it('returns the profile Auth reports for a live session', async () => {
    const fetch = reply(200, { id: 'a', employeeId: null, role: 'ADMIN_HRD', mustChangePassword: false, email: 'x@example.invalid' });
    await expect(new AuthClient(config).profile('Bearer t', 'rid')).resolves.toEqual({ id: 'a', role: 'ADMIN_HRD', mustChangePassword: false, employeeId: null });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3001/api/v1/auth/me', expect.objectContaining({ redirect: 'manual' }));
  });
  it('treats a revoked or expired session (401) as unauthenticated', async () => {
    reply(401, { message: 'Sesi tidak valid.' });
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('maps Auth outages and malformed bodies to 503, never to access', async () => {
    reply(500, {});
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(ServiceUnavailableException);
    reply(200, { role: 'ADMIN_HRD' });
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(ServiceUnavailableException);
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    await expect(new AuthClient(config).profile('Bearer t')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('AdminGuard', () => {
  const context = (authorization?: string) => {
    const request: Record<string, unknown> = { headers: authorization ? { authorization } : {} };
    return { request, ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
  };
  const guard = (profile: SessionProfile) => new AdminGuard({ profile: () => Promise.resolve(profile) } as unknown as AuthClient);
  it('requires a bearer header', async () => {
    await expect(guard({ id: 'a', role: 'ADMIN_HRD', mustChangePassword: false }).canActivate(context().ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('allows only HR admins who completed the initial password change', async () => {
    const ok = context('Bearer t');
    await expect(guard({ id: 'a', role: 'ADMIN_HRD', mustChangePassword: false }).canActivate(ok.ctx)).resolves.toBe(true);
    expect(ok.request.actor).toMatchObject({ id: 'a' });
    await expect(guard({ id: 'b', role: 'EMPLOYEE', mustChangePassword: false }).canActivate(context('Bearer t').ctx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard({ id: 'c', role: 'ADMIN_HRD', mustChangePassword: true }).canActivate(context('Bearer t').ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('UserSessionGuard', () => {
  const context = (authorization?: string) => {
    const request: Record<string, unknown> = { headers: authorization ? { authorization } : {} };
    return { request, ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
  };
  const guard = (profile: SessionProfile) => new UserSessionGuard({ profile: () => Promise.resolve(profile) } as unknown as AuthClient);
  it('accepts both signed-in roles and attaches their identity for self-service reads', async () => {
    const employee = context('Bearer e');
    await expect(guard({ id: 'emp-account', employeeId: 'emp-1', role: 'EMPLOYEE', mustChangePassword: false }).canActivate(employee.ctx)).resolves.toBe(true);
    expect(employee.request.actor).toMatchObject({ employeeId: 'emp-1', role: 'EMPLOYEE' });
    const admin = context('Bearer a');
    await expect(guard({ id: 'admin', employeeId: null, role: 'ADMIN_HRD', mustChangePassword: false }).canActivate(admin.ctx)).resolves.toBe(true);
    expect(admin.request.actor).toMatchObject({ employeeId: null, role: 'ADMIN_HRD' });
  });
  it('blocks accounts that still need their initial password changed', async () => {
    await expect(guard({ id: 'employee', employeeId: 'emp-1', role: 'EMPLOYEE', mustChangePassword: true }).canActivate(context('Bearer e').ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
