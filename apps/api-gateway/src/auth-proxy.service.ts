import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GatewayConfig } from './gateway.config';

@Injectable()
export class AuthProxyService {
  constructor(private readonly config: GatewayConfig) {}
  async forward(
    path: string,
    method: 'GET' | 'POST',
    headers: Record<string, string> = {},
    body?: unknown,
  ) {
    try {
      const response = await fetch(`${this.config.authUrl}${path}`, {
        method,
        headers: {
          ...headers,
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
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
        if (size > 65536) {
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
      throw new ServiceUnavailableException(
        'Layanan autentikasi sementara tidak tersedia.',
      );
    }
  }
}
