import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GatewayConfig } from './gateway.config';

export type Upstream = 'auth' | 'employee';
type Method = 'GET' | 'POST' | 'PATCH';
const OUTAGE: Record<Upstream, string> = {
  auth: 'Layanan autentikasi sementara tidak tersedia.',
  employee: 'Layanan data karyawan sementara tidak tersedia.',
};

@Injectable()
export class AuthProxyService {
  constructor(private readonly config: GatewayConfig) {}
  async forward(
    path: string,
    method: Method,
    headers: Record<string, string> = {},
    body?: unknown,
    upstream: Upstream = 'auth',
  ) {
    const base = upstream === 'auth' ? this.config.authUrl : this.config.employeeUrl;
    const withBody = method !== 'GET';
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...headers,
          ...(withBody ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(withBody ? { body: JSON.stringify(body ?? {}) } : {}),
        signal: AbortSignal.timeout(this.config.timeoutMs),
        redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400)
        throw new Error('Unexpected redirect');
      if (!response.headers.get('content-type')?.includes('application/json'))
        throw new Error('Unexpected response type');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Missing response');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 262144) {
          await reader.cancel();
          throw new Error('Oversized response');
        }
        chunks.push(chunk.value);
      }
      const payload: unknown = JSON.parse(
        Buffer.concat(chunks).toString('utf8'),
      );
      if (payload === null || typeof payload !== 'object')
        throw new Error('Unexpected response body');
      return {
        status: response.status,
        payload,
        cookies: response.headers.getSetCookie(),
        retryAfter: response.headers.get('retry-after'),
      };
    } catch {
      throw new ServiceUnavailableException(OUTAGE[upstream]);
    }
  }
}
