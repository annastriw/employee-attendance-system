import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AuthConfig } from '../config/auth.config';
export function internalSignature(secret: string, timestamp: string, path: string, body: unknown) {
  return createHmac('sha256', Buffer.from(secret, 'hex')).update(timestamp + '\nPOST\n' + path + '\n' + JSON.stringify(body)).digest('hex');
}
export function sealCredential(password: string, key: string, operationId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(operationId));
  const content = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), content].map(value => value.toString('base64url')).join('.');
}
export function openCredential(envelope: string, key: string, operationId: string) {
  const [iv, tag, content] = envelope.split('.').map(value => Buffer.from(value, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  decipher.setAAD(Buffer.from(operationId)); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8');
}
@Injectable()
export class ProvisioningSecurity implements CanActivate {
  readonly secret: string;
  readonly credentialKey: string;
  constructor(_config: AuthConfig) {
    this.secret = process.env.PROVISIONING_SERVICE_SECRET ?? '';
    this.credentialKey = process.env.PROVISIONING_CREDENTIAL_KEY ?? '';
    if (![this.secret, this.credentialKey].every(value => /^[a-f0-9]{64}$/.test(value)) || this.secret === this.credentialKey)
      throw new Error('Configure separate provisioning service and credential keys (32 random bytes each).');
  }
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const timestamp = req.headers['x-service-timestamp'];
    const signature = req.headers['x-service-signature'];
    if (typeof timestamp !== 'string' || !/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 60000 ||
        typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) throw new UnauthorizedException('Request internal tidak valid.');
    const expected = internalSignature(this.secret, timestamp, req.path, req.body);
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) throw new UnauthorizedException('Request internal tidak valid.');
    return true;
  }
}
