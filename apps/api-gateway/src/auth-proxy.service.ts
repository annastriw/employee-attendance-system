import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GatewayConfig } from './gateway.config';

export type Upstream = 'auth' | 'employee' | 'attendance' | 'media';
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const OUTAGE: Record<Upstream, string> = {
  media: 'Layanan foto sementara tidak tersedia.',
  auth: 'Layanan autentikasi sementara tidak tersedia.',
  employee: 'Layanan data karyawan sementara tidak tersedia.',
  attendance: 'Layanan absensi sementara tidak tersedia.',
};

@Injectable()
export class AuthProxyService {
  constructor(private readonly config: GatewayConfig) {}
  async forwardMultipart(body: FormData, headers: Record<string, string>) {
    return this.forward(
      '/api/v1/media/attendance-photos',
      'POST',
      headers,
      body,
      'media',
    );
  }
  async forward(
    path: string,
    method: Method,
    headers: Record<string, string> = {},
    body?: unknown,
    upstream: Upstream = 'auth',
  ) {
    const base =
      upstream === 'auth'
        ? this.config.authUrl
        : upstream === 'employee'
          ? this.config.employeeUrl
          : upstream === 'attendance'
            ? this.config.attendanceUrl
            : this.config.mediaUrl;
    const withBody = method !== 'GET' && method !== 'DELETE';
    const multipart = body instanceof FormData;
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...headers,
          ...(withBody && !multipart
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        ...(withBody
          ? { body: multipart ? body : JSON.stringify(body ?? {}) }
          : {}),
        signal: AbortSignal.timeout(
          upstream === 'media'
            ? 15000
            : upstream === 'attendance' &&
                path === '/api/v1/me/attendance/check-in'
              ? 30000
              : this.config.timeoutMs,
        ),
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
