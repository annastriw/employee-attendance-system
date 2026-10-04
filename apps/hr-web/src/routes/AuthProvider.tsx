import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient, AuthError, type AdminUser, type AuthClient } from "../lib/auth-client";
import { AuthContext, type AuthState } from "./auth-context";

/**
 * Owns the authentication lifecycle (restore, login, change password, logout)
 * that previously lived in App.tsx, so the router and its guards can read the
 * session from one place. Behaviour is unchanged: the same client calls, the
 * same Indonesian messages, and the same 401-clears-session rule.
 */
export function AuthProvider({
  client = authClient,
  children,
}: {
  client?: AuthClient;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    client
      .restore()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Sesi tidak dapat dipulihkan.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client]);

  const act = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Terjadi kesalahan. Coba lagi.",
      );
      if (reason instanceof AuthError && reason.status === 401) setUser(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) =>
      act(async () => {
        setUser(await client.login(email, password));
      }),
    [act, client],
  );

  const changePassword = useCallback(
    (current: string, replacement: string) =>
      act(async () => {
        await client.changePassword(current, replacement);
        setUser(null);
        setMessage(
          "Password berhasil diperbarui. Silakan masuk dengan password baru.",
        );
      }),
    [act, client],
  );

  const logout = useCallback(
    () =>
      act(async () => {
        await client.logout();
        setUser(null);
      }),
    [act, client],
  );

  const sessionExpired = useCallback(() => {
    setUser(null);
    setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
  }, []);

  const clearFeedback = useCallback(() => {
    setError("");
    setMessage("");
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      busy,
      error,
      message,
      client,
      login,
      changePassword,
      logout,
      sessionExpired,
      clearFeedback,
    }),
    [
      user,
      loading,
      busy,
      error,
      message,
      client,
      login,
      changePassword,
      logout,
      sessionExpired,
      clearFeedback,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
