import { useEffect, useState } from "react";
import { PageTitle } from "./components/atoms/Brand";
import { Notice } from "./components/molecules/Notice";
import {
  LoginForm,
  ChangePasswordForm,
} from "./components/organisms/AuthForms";
import { AuthLayout } from "./components/templates/AuthLayout";
import { DashboardPage } from "./pages/DashboardPage";
import {
  authClient,
  AuthError,
  type AdminUser,
  type AuthClient,
} from "./lib/auth-client";
export function App({ client = authClient }: { client?: AuthClient }) {
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
  async function act(action: () => Promise<void>) {
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
      if (reason instanceof AuthError && reason.status === 401 && user)
        setUser(null);
    } finally {
      setBusy(false);
    }
  }
  const logout = () =>
    act(async () => {
      await client.logout();
      setUser(null);
    });
  if (loading)
    return (
      <AuthLayout>
        <p role="status" className="loading-session">
          Memeriksa sesi Anda…
        </p>
      </AuthLayout>
    );
  if (user && !user.mustChangePassword)
    return (
      <DashboardPage user={user} busy={busy} error={error} onLogout={logout} />
    );
  return (
    <AuthLayout>
      {user ? (
        <>
          <PageTitle>Buat password baru</PageTitle>
          <p className="page-intro">
            Ganti password awal untuk melanjutkan.
          </p>
          <p className="signed-in-email">{user.email}</p>
          <ChangePasswordForm
            busy={busy}
            error={error}
            onLogout={logout}
            onSubmit={(current, replacement) =>
              act(async () => {
                await client.changePassword(current, replacement);
                setUser(null);
                setMessage(
                  "Password berhasil diperbarui. Silakan masuk dengan password baru.",
                );
              })
            }
          />
        </>
      ) : (
        <>
          <PageTitle>Masuk</PageTitle>
          {message && <Notice message={message} success />}
          <LoginForm
            busy={busy}
            error={error}
            onSubmit={(email, password) =>
              act(async () => {
                setUser(await client.login(email, password));
              })
            }
          />
        </>
      )}
    </AuthLayout>
  );
}
export default App;
