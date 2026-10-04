import { describe, expect, it, vi } from "vitest";
import { AuthError, createAuthClient, type EmployeeUser } from "./auth-client";

const employee: EmployeeUser = {
  id: "employee-account",
  email: "employee@example.test",
  employeeId: "employee-profile",
  role: "EMPLOYEE",
  mustChangePassword: true,
};
const session = {
  accessToken: "access-in-memory",
  expiresIn: 900,
  user: employee,
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Employee authentication client", () => {
  it("coalesces restore and requests the employee refresh cookie", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(session));
    const client = createAuthClient("/api/v1", fetcher);
    expect(await Promise.all([client.restore(), client.restore()])).toEqual([
      employee,
      employee,
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/auth/refresh");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      body: '{"panel":"employee"}',
    });
  });

  it("logs in through the employee endpoint and clears access after password change", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ ok: true }));
    const client = createAuthClient("/api/v1", fetcher);
    expect(await client.login(employee.email, "temporary-password")).toEqual(
      employee,
    );
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/auth/employee/login");
    await client.changePassword(
      "temporary-password",
      "new-password-long-enough",
    );
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: "Bearer access-in-memory",
    });
    expect(client.currentUser()).toBeNull();
  });

  it("rejects an HR session or a missing employee profile", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ ...session, user: { ...employee, role: "ADMIN_HRD" } }),
      )
      .mockResolvedValueOnce(
        response({ ...session, user: { ...employee, employeeId: null } }),
      );
    const client = createAuthClient("/api/v1", fetcher);
    await expect(
      client.login(employee.email, "wrong-panel"),
    ).rejects.toMatchObject({
      status: 403,
      message: "Akun ini tidak memiliki akses ke portal karyawan.",
    });
    await expect(
      client.login(employee.email, "missing-profile"),
    ).rejects.toBeInstanceOf(AuthError);
    expect(client.currentUser()).toBeNull();
  });

  it("treats missing employee cookie as signed out and preserves service errors", async () => {
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

  it("clears a revoked session and never retries a failed password change", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({}, 401));
    const client = createAuthClient("/api/v1", fetcher);
    await client.login(employee.email, "temporary-password");
    await expect(
      client.changePassword("temporary-password", "new-password-long-enough"),
    ).rejects.toMatchObject({ status: 401 });
    expect(client.currentUser()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reports network failure without exposing the underlying error", async () => {
    const client = createAuthClient(
      "/api/v1",
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("internal host secret")),
    );
    await expect(client.restore()).rejects.toMatchObject({
      status: 0,
      message: "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.",
    });
  });
});
describe("multipart authenticated API", () => {
  it("keeps the browser boundary, bearer, cookies and caller cancellation signal", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ status: "READY" }));
    const client = createAuthClient("/api/v1", fetcher);
    await client.login(employee.email, "test-password");
    const body = new FormData();
    body.append(
      "photo",
      new Blob(["jpeg"], { type: "image/jpeg" }),
      "attendance.jpg",
    );
    const controller = new AbortController();
    await client.api("media/attendance-photos", {
      method: "POST",
      body,
      idempotencyKey: "same-key",
      signal: controller.signal,
    });
    const init = fetcher.mock.calls[1][1]!;
    expect(init.body).toBe(body);
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({
      Authorization: "Bearer access-in-memory",
      "Idempotency-Key": "same-key",
    });
    controller.abort();
    expect(init.signal?.aborted).toBe(true);
  });
  it("clears access on upload 401 and does not retry a failed mutation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({}, 401));
    const client = createAuthClient("/api/v1", fetcher);
    await client.login(employee.email, "test-password");
    await expect(
      client.api("media/attendance-photos", {
        method: "POST",
        body: new FormData(),
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(client.currentUser()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
