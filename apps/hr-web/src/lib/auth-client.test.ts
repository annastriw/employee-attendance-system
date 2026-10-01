import { describe, it, expect, vi } from "vitest";
import { createAuthClient, AuthError } from "./auth-client";
const user = {
  id: "admin-id",
  email: "admin@example.test",
  role: "ADMIN_HRD",
  employeeId: null,
  mustChangePassword: true,
};
const session = { accessToken: "opaque-access-token", expiresIn: 900, user };
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("HR authentication client", () => {
  it("coalesces concurrent restore calls into one refresh request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(session));
    const client = createAuthClient("http://localhost:3000/api/v1", fetcher);
    const users = await Promise.all([client.restore(), client.restore()]);
    expect(users).toEqual([user, user]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      body: '{"panel":"admin"}',
    });
  });
  it("adds the memory token to protected requests and clears it after password change", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ ok: true }));
    const client = createAuthClient("http://localhost:3000/api/v1", fetcher);
    await client.login("admin@example.test", "test-password");
    await client.changePassword("test-password", "another-test-password");
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: "Bearer opaque-access-token",
    });
    expect(client.currentUser()).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it("treats a missing cookie as signed out but preserves a service failure", async () => {
    const client = createAuthClient(
      "/api/v1",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response({}, 401))
        .mockResolvedValueOnce(response({}, 503)),
    );
    expect(await client.restore()).toBeNull();
    await expect(client.restore()).rejects.toMatchObject({ status: 503 });
  });
  it("rejects employee sessions in the HR portal", async () => {
    const client = createAuthClient(
      "/api/v1",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          response({ ...session, user: { ...user, role: "EMPLOYEE" } }),
        ),
    );
    await expect(
      client.login("employee@example.test", "test-password"),
    ).rejects.toBeInstanceOf(AuthError);
    expect(client.currentUser()).toBeNull();
  });
  it("does not retry a failed password change and clears revoked access", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({}, 401));
    const client = createAuthClient("/api/v1", fetcher);
    await client.login("admin@example.test", "test-password");
    await expect(
      client.changePassword("test-password", "another-test-password"),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(client.currentUser()).toBeNull();
  });
  it("reports network failure without leaking the underlying exception", async () => {
    const client = createAuthClient(
      "/api/v1",
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("secret internal host")),
    );
    await expect(client.restore()).rejects.toMatchObject({
      message: "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.",
    });
  });
  it("refreshes once before using an expiring token", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
    try {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response(session))
        .mockResolvedValueOnce(
          response({ ...session, accessToken: "rotated-access-token" }),
        )
        .mockResolvedValueOnce(response({ ok: true }));
      const client = createAuthClient("/api/v1", fetcher);
      await client.login("admin@example.test", "test-password");
      clock.mockReturnValue(1000000);
      await client.logout();
      expect(fetcher.mock.calls[1][0]).toBe("/api/v1/auth/refresh");
      expect(fetcher.mock.calls[2][1]?.headers).toMatchObject({
        Authorization: "Bearer rotated-access-token",
      });
    } finally {
      clock.mockRestore();
    }
  });
  it('passes an explicit creation idempotency key through authenticated API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response(session)).mockResolvedValueOnce(response({ id: 'operation', status: 'PENDING' }));
    const client = createAuthClient('/api/v1', fetcher); await client.login('admin@example.test', 'test-password');
    await client.api('employees', { method: 'POST', body: { nik: 'TEST-01' }, idempotencyKey: 'test-operation-key' });
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ 'Idempotency-Key': 'test-operation-key', Authorization: 'Bearer ' + session.accessToken });
  });
});
