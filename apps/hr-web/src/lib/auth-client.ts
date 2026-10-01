export interface AdminUser {
  id: string;
  email: string;
  employeeId: string | null;
  role: "ADMIN_HRD";
  mustChangePassword: boolean;
}
interface Session {
  accessToken: string;
  expiresIn: number;
  user: AdminUser;
}
export class AuthError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const messages: Record<number, string> = {
  400: "Periksa kembali data yang Anda masukkan.",
  401: "Email atau password salah, atau sesi Anda telah berakhir.",
  403: "Akun ini tidak memiliki akses ke portal HRD.",
  429: "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.",
};
export function createAuthClient(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
) {
  let token: string | null = null;
  let user: AdminUser | null = null;
  let expiresAt = 0;
  let restoring: Promise<AdminUser | null> | null = null;
  function clear() {
    token = null;
    user = null;
    expiresAt = 0;
  }
  async function send(
    path: string,
    body?: unknown,
    authenticated = false,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/auth/${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "include",
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(authenticated && token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new AuthError(
        0,
        "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.",
      );
    }
    if (!response.ok) {
      if (response.status === 401 && authenticated) clear();
      throw new AuthError(
        response.status,
        messages[response.status] ??
          "Layanan sementara tidak tersedia. Coba lagi sebentar.",
      );
    }
    try {
      return await response.json();
    } catch {
      throw new AuthError(
        503,
        "Respons layanan tidak dapat dibaca. Coba lagi sebentar.",
      );
    }
  }
  function accept(value: unknown) {
    const session = value as Session | null;
    if (
      !session ||
      typeof session.accessToken !== "string" ||
      !session.accessToken ||
      !Number.isFinite(session.expiresIn) ||
      session.expiresIn <= 0 ||
      !session.user ||
      session.user.role !== "ADMIN_HRD" ||
      typeof session.user.id !== "string" ||
      typeof session.user.email !== "string" ||
      typeof session.user.mustChangePassword !== "boolean"
    ) {
      clear();
      throw new AuthError(403, "Akun ini tidak memiliki akses ke portal HRD.");
    }
    token = session.accessToken;
    user = {
      id: session.user.id,
      email: session.user.email,
      role: "ADMIN_HRD",
      employeeId: session.user.employeeId,
      mustChangePassword: session.user.mustChangePassword,
    };
    expiresAt = Date.now() + session.expiresIn * 1000;
    return user;
  }
  function restore(): Promise<AdminUser | null> {
    if (restoring) return restoring;
    restoring = send("refresh", { panel: "admin" })
      .then(accept)
      .catch((error: unknown) => {
        if (error instanceof AuthError && error.status === 401) {
          clear();
          return null;
        }
        throw error;
      })
      .finally(() => {
        restoring = null;
      });
    return restoring;
  }
  async function ensureSession() {
    if (!token || expiresAt <= Date.now() + 30000) await restore();
    if (!token)
      throw new AuthError(
        401,
        "Sesi Anda telah berakhir. Silakan masuk kembali.",
      );
  }
  async function api<T>(
    path: string,
    init: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
  ): Promise<T> {
    await ensureSession();
    const method = init.method ?? "GET";
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/${path}`, {
        method,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
        },
        ...(method !== "GET" ? { body: JSON.stringify(init.body ?? {}) } : {}),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new AuthError(0, "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.");
    }
    const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
    if (!response.ok) {
      if (response.status === 401) {
        clear();
        throw new AuthError(401, "Sesi Anda telah berakhir. Silakan masuk kembali.");
      }
      // Domain services return short, user-facing Indonesian messages for these.
      const own = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
      if ([400, 404, 409].includes(response.status) && typeof own === "string")
        throw new AuthError(response.status, own);
      throw new AuthError(
        response.status,
        response.status === 403
          ? "Anda tidak memiliki akses untuk tindakan ini."
          : "Layanan sementara tidak tersedia. Coba lagi sebentar.",
      );
    }
    if (!payload) throw new AuthError(503, "Respons layanan tidak dapat dibaca. Coba lagi sebentar.");
    return payload as T;
  }
  return {
    restore,
    api,
    currentUser: () => user,
    async login(email: string, password: string) {
      return accept(await send("admin/login", { email, password }));
    },
    async changePassword(currentPassword: string, newPassword: string) {
      await ensureSession();
      await send("change-password", { currentPassword, newPassword }, true);
      clear();
    },
    async logout() {
      await ensureSession();
      await send("logout", {}, true);
      clear();
    },
  };
}
export type AuthClient = ReturnType<typeof createAuthClient>;
export const authClient = createAuthClient(
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1",
);
