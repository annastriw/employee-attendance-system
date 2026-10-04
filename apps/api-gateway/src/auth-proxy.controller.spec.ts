import { AuthProxyService } from './auth-proxy.service';
import { AuthProxyController } from './auth-proxy.controller';

describe('AuthProxyController health', () => {
  const originalReleaseSha = process.env.RELEASE_SHA;
  const proxy = {
    forward: jest.fn().mockResolvedValue({ status: 200 }),
  };
  const controller = new AuthProxyController(proxy as unknown as AuthProxyService);

  afterEach(() => {
    if (originalReleaseSha === undefined) delete process.env.RELEASE_SHA;
    else process.env.RELEASE_SHA = originalReleaseSha;
    proxy.forward.mockClear();
  });

  it('includes the image commit in the ready health response', async () => {
    process.env.RELEASE_SHA = 'b'.repeat(40);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      service: 'api-gateway',
      auth: 'ready',
      release: 'b'.repeat(40),
    });
    expect(proxy.forward).toHaveBeenCalledWith('/health', 'GET');
  });
});
