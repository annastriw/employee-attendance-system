import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Client } from 'minio';
import http, { Agent as HttpAgent } from 'node:http';
import https, { Agent as HttpsAgent } from 'node:https';
import { MediaConfig } from '../config/media.config';
import { MAX_PHOTO_BYTES, sha256 } from '../photos/photo-normalizer';

@Injectable()
export class PhotoStorage implements OnModuleDestroy {
  readonly client: Client;
  private readonly publicClient: Client;
  private readonly agent: HttpAgent;
  constructor(private readonly config: MediaConfig) {
    const url = config.endpoint;
    this.agent =
      url.protocol === 'https:'
        ? new HttpsAgent({
            keepAlive: true,
            maxSockets: 4,
            timeout: config.timeoutMs,
          })
        : new HttpAgent({
            keepAlive: true,
            maxSockets: 4,
            timeout: config.timeoutMs,
          });
    const options = (endpoint: URL) => ({
      endPoint: endpoint.hostname,
      port: Number(
        endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80),
      ),
      useSSL: endpoint.protocol === 'https:',
      region: 'us-east-1',
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    const native = url.protocol === 'https:' ? https : http;
    const transport = {
      request: ((
        options: http.RequestOptions,
        callback?: (response: http.IncomingMessage) => void,
      ) => {
        const request = native.request(options, callback);
        const deadline = setTimeout(
          () => request.destroy(new Error('Storage request deadline exceeded')),
          config.timeoutMs,
        );
        request.once('close', () => clearTimeout(deadline));
        return request;
      }) as typeof http.request,
    };
    this.client = new Client({
      ...options(url),
      transportAgent: this.agent,
      transport,
      retryOptions: { disableRetry: true },
    });

    this.publicClient = new Client(options(config.publicEndpoint));
  }
  async matches(key: string, checksum: string): Promise<boolean> {
    let stream;
    try {
      stream = await this.client.getObject(this.config.bucket, key);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'NoSuchKey'
      )
        return false;
      throw error;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > MAX_PHOTO_BYTES)
          throw new Error('Stored image exceeds limit');
        chunks.push(bytes);
      }
      if (sha256(Buffer.concat(chunks)) !== checksum)
        throw new Error('Stored image checksum mismatch');
      return true;
    } finally {
      stream.destroy();
    }
  }
  async put(key: string, bytes: Buffer) {
    await this.client.putObject(this.config.bucket, key, bytes, bytes.length, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, no-store',
    });
  }
  async signedUrl(key: string) {
    return this.publicClient.presignedGetObject(this.config.bucket, key, 60, {
      'response-content-type': 'image/jpeg',
      'response-cache-control': 'private, no-store',
    });
  }
  async ready() {
    return this.client.bucketExists(this.config.bucket);
  }
  onModuleDestroy() {
    this.agent.destroy();
  }
}
