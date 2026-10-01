import { AdminSeedService } from './admin-seed.service';
import type { DatabaseService } from '../database/database.service';
import { compare } from 'bcrypt';

describe('HRD seed', () => {
  const findFirst = jest.fn();
  const create = jest.fn();
  const audit = jest.fn();
  const tx = { authAccount: { findFirst, create }, authAuditLog: { create: audit } };
  const database = { client: { $transaction: async (fn: (tx: unknown) => unknown) => fn(tx) } };
  const service = new AdminSeedService(database as unknown as DatabaseService);
  afterEach(() => jest.resetAllMocks());
  it('creates active HRD with salted bcrypt and mandatory password change', async () => {
    findFirst.mockResolvedValue(null);
    create.mockImplementation((args: { data: unknown }) => Promise.resolve({ id: 'account', ...args.data as object }));
    await service.seed(' ADMIN@example.test ', 'TestPassword-123456');
    const data = create.mock.calls[0][0].data;
    expect(data.email).toBe('admin@example.test');
    expect(data.status).toBe('ACTIVE');
    expect(data.mustChangePassword).toBe(true);
    expect(data.passwordHash).not.toBe('TestPassword-123456');
    expect(await compare('TestPassword-123456', data.passwordHash)).toBe(true);
    expect(audit.mock.calls[0][0].data).not.toHaveProperty('password');
  });
  it('preserves existing admin password and status', async () => {
    findFirst.mockResolvedValue({ id: 'existing', email: 'admin@example.test' });
    expect(await service.seed('admin@example.test', 'DifferentPassword-123')).toEqual({ created: false, id: 'existing' });
    expect(create).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
  it('refuses to add a second HRD with another email', async () => {
    findFirst.mockResolvedValue({ id: 'existing', email: 'other@example.test' });
    await expect(service.seed('admin@example.test', 'TestPassword-123456')).rejects.toThrow('already exists');
    expect(create).not.toHaveBeenCalled();
  });
});
