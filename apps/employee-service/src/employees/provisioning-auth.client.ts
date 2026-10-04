import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { EmployeeConfig } from '../config/employee.config';
export interface AccountReceipt { operationId: string; accountId: string; finalized: boolean }
@Injectable()
export class ProvisioningAuthClient {
  constructor(private readonly config: EmployeeConfig) {}
  async call<T>(id: string, action: 'prepare' | 'finalize' | 'credentials' | 'email' | 'lifecycle' | 'reset-password', body: unknown, requestId?: string, authorization?: string): Promise<T> {
    const path = action === 'email' ? '/api/v1/internal/employee-email-changes/' + id
      : action === 'lifecycle' ? '/api/v1/internal/employee-lifecycle/' + id
      : action === 'reset-password' ? '/api/v1/internal/employee-reset-password/' + id
      : '/api/v1/internal/provisioning/' + id + '/' + action;
    const timestamp = String(Date.now()); const payload = JSON.stringify(body);
    const signature = createHmac('sha256', Buffer.from(this.config.provisioningSecret, 'hex')).update(timestamp + '\nPOST\n' + path + '\n' + payload).digest('hex');
    let response: Response;
    try { response = await fetch(this.config.authUrl + path, { method: 'POST', body: payload, redirect: 'manual', signal: AbortSignal.timeout(this.config.timeoutMs), headers: { 'Content-Type': 'application/json', 'X-Service-Timestamp': timestamp, 'X-Service-Signature': signature, ...(requestId ? { 'X-Request-ID': requestId } : {}), ...(authorization ? { authorization } : {}) } }); }
    catch { throw new ServiceUnavailableException('Layanan akun sementara tidak tersedia.'); }
    const data = await response.json().catch(() => null) as { message?: unknown } | null;
    if (!response.ok) {
      if ([400, 401, 403, 404, 409].includes(response.status)) throw new HttpException(typeof data?.message === 'string' ? data.message : 'Operasi akun ditolak.', response.status);
      throw new ServiceUnavailableException('Layanan akun sementara tidak tersedia.');
    }
    if (!data || typeof data !== 'object') throw new ServiceUnavailableException('Respons layanan akun tidak valid.');
    return data as T;
  }
}
