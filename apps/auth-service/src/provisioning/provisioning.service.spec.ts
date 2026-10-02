import { randomBytes, randomUUID } from 'node:crypto';
import { AccountProvisioningService } from './provisioning.service';
import { sealCredential } from './provisioning-security';
import type { ProvisioningSecurity } from './provisioning-security';
import type { DatabaseService } from '../database/database.service';
import type { AuthService } from '../auth/auth.service';
const actorId = randomUUID(); const accountId = randomUUID(); const operationId = randomUUID();
const key = randomBytes(32).toString('hex');
function setup() {
  const session = { id: randomUUID(), accountId: actorId, account: { role: 'ADMIN_HRD', status: 'ACTIVE', mustChangePassword: false }, expiresAt: new Date(Date.now() + 60000), revokedAt: null };
  const receipt = { id: operationId, accountId, actorAccountId: actorId, finalized: true, credentialEnvelope: sealCredential('one-time-test-password', key, operationId) };
  const account = { id: accountId, email: 'employee@example.test', status: 'ACTIVE', mustChangePassword: true, passwordChangedAt: null };
  const tx = { $queryRaw: jest.fn().mockResolvedValue([]), authProvisioning: { findUnique: jest.fn().mockResolvedValue(receipt), update: jest.fn().mockResolvedValue({}) }, authAccount: { findUniqueOrThrow: jest.fn().mockResolvedValue(account), update: jest.fn().mockResolvedValue({}) }, authSession: { findUnique: jest.fn().mockResolvedValue(session), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, authAuditLog: { create: jest.fn().mockResolvedValue({}) } };
  const db = { client: { $transaction: (work: (value: typeof tx) => unknown) => work(tx) } } as unknown as DatabaseService;
  const auth = { authenticate: jest.fn().mockResolvedValue(session) } as unknown as AuthService;
  const service = new AccountProvisioningService(db, auth, { credentialKey: key } as ProvisioningSecurity);
  return { tx, session, receipt, account, service };
}
describe('Credential authorization and recovery', () => {
  it('clears ciphertext and returns credential only to original actor', async () => {
    const { service, tx } = setup();
    await expect(service.claim(operationId, {}, 'Bearer test')).resolves.toEqual({ email: 'employee@example.test', temporaryPassword: 'one-time-test-password' });
    expect(tx.authProvisioning.update).toHaveBeenCalledWith({ where: { id: operationId }, data: { credentialEnvelope: null, credentialClaimedAt: expect.any(Date) } });
    expect(JSON.stringify(tx.authAuditLog.create.mock.calls)).not.toContain('one-time-test-password');
  });
  it('uses canonical receipt ID when a case-insensitive UUID is requested', async () => {
    const { service } = setup(); await expect(service.claim(operationId.toUpperCase(), {}, 'Bearer test')).resolves.toMatchObject({ temporaryPassword: 'one-time-test-password' });
  });
  it('rejects another actor and a revoked session at the transaction boundary', async () => {
    const first = setup(); first.receipt.actorAccountId = randomUUID();
    await expect(first.service.claim(operationId, {}, 'Bearer test')).rejects.toThrow('tidak ditemukan');
    const second = setup(); second.tx.authSession.findUnique.mockResolvedValue({ ...second.session, revokedAt: new Date() });
    await expect(second.service.claim(operationId, {}, 'Bearer test')).rejects.toThrow('Sesi tidak valid');
    expect(second.tx.authProvisioning.update).not.toHaveBeenCalled();
  });
  it('does not re-reveal a consumed receipt', async () => {
    const { service, tx, receipt } = setup(); tx.authProvisioning.findUnique.mockResolvedValue({ ...receipt, credentialEnvelope: null });
    await expect(service.claim(operationId, {}, 'Bearer test')).rejects.toThrow('sudah ditampilkan');
  });
  it('cannot recover after employee changed the initial password', async () => {
    const { service, tx, receipt, account } = setup(); tx.authProvisioning.findUnique.mockResolvedValue({ ...receipt, credentialEnvelope: null });
    tx.authAccount.findUniqueOrThrow.mockResolvedValue({ ...account, mustChangePassword: false, passwordChangedAt: new Date() });
    await expect(service.claim(operationId, { recover: true }, 'Bearer test')).rejects.toThrow('tidak dapat dibuat ulang');
    expect(tx.authAccount.update).not.toHaveBeenCalled();
  });
});
