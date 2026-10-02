import { randomBytes, randomUUID } from 'node:crypto';
import { internalSignature, openCredential, sealCredential, ProvisioningSecurity } from './provisioning-security';
import type { AuthConfig } from '../config/auth.config';
import type { ExecutionContext } from '@nestjs/common';
describe('Provisioning authentication and encrypted receipt', () => {
  const key = randomBytes(32).toString('hex'); const secret = randomBytes(32).toString('hex');
  const id = randomUUID(); const password = randomBytes(24).toString('base64url');
  it('encrypts with fresh nonce and binds ciphertext to operation', () => {
    const first = sealCredential(password, key, id); const second = sealCredential(password, key, id);
    expect(first).not.toBe(second); expect(first).not.toContain(password);
    expect(openCredential(first, key, id)).toBe(password);
    expect(() => openCredential(first, key, randomUUID())).toThrow();
    expect(() => openCredential(first, secret, id)).toThrow();
  });
  it('authenticates method/path/body and rejects stale or altered delivery', () => {
    const oldSecret = process.env.PROVISIONING_SERVICE_SECRET, oldKey = process.env.PROVISIONING_CREDENTIAL_KEY;
    process.env.PROVISIONING_SERVICE_SECRET = secret; process.env.PROVISIONING_CREDENTIAL_KEY = key;
    try {
      const guard = new ProvisioningSecurity({} as AuthConfig); const timestamp = String(Date.now());
      const req = { path: '/api/v1/internal/provisioning/' + id + '/prepare', body: { email: 'test@example.test' }, headers: { 'x-service-timestamp': timestamp, 'x-service-signature': '' } };
      const context = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      req.headers['x-service-signature'] = internalSignature(secret, timestamp, req.path, req.body);
      expect(guard.canActivate(context)).toBe(true);
      req.body.email = 'other@example.test'; expect(() => guard.canActivate(context)).toThrow();
      req.headers['x-service-timestamp'] = String(Date.now() - 61000); expect(() => guard.canActivate(context)).toThrow();
    } finally { if (oldSecret === undefined) delete process.env.PROVISIONING_SERVICE_SECRET; else process.env.PROVISIONING_SERVICE_SECRET = oldSecret; if (oldKey === undefined) delete process.env.PROVISIONING_CREDENTIAL_KEY; else process.env.PROVISIONING_CREDENTIAL_KEY = oldKey; }
  });
});
