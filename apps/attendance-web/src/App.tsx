import { lazy, Suspense, useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import {
  authClient,
  AuthError,
  type AuthClient,
  type EmployeeUser,
} from "./lib/auth-client";
import { useHashRoute, type View } from "./lib/use-hash-route";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

const CapturePage = lazy(() => import("./pages/CapturePage"));

export function App({ client = authClient }: { client?: AuthClient }) {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { view, navigate } = useHashRoute();

  useEffect(() => {
    let active = true;
    client
      .restore()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Sesi tidak dapat dipulihkan.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client]);

  const required: View = user
    ? user.mustChangePassword
      ? "ganti-password"
      : "beranda"
    : "masuk";
  useEffect(() => {
    if (
      !loading &&
      view !== required &&
      !(required === "beranda" && view === "foto-checkin")
    )
      navigate(required);
  }, [loading, navigate, required, view]);

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
      if (reason instanceof AuthError && reason.status === 401 && user) {
        setUser(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const logout = () =>
    act(async () => {
      await client.logout();
      setUser(null);
    });

  if (loading) {
    return (
      <AuthShell
        name="Attendance Portal"
        brandIcon={<Clock size={16} weight="bold" />}
      >
        <p role="status" className="loading-session">
          Memeriksa sesi Anda…
        </p>
      </AuthShell>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <ChangePasswordPage
        user={user}
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
    );
  }

  if (user) {
    if (view === "foto-checkin")
      return (
        <Suspense
          fallback={
            <AuthShell
              name="Attendance Portal"
              brandIcon={<Clock size={16} weight="bold" />}
            >
              <p role="status">Menyiapkan kamera…</p>
            </AuthShell>
          }
        >
          <CapturePage
            client={client}
            onBack={() => navigate("beranda")}
            onSessionExpired={() => {
              setUser(null);
              setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
            }}
          />
        </Suspense>
      );
    return (
      <HomePage
        user={user}
        busy={busy}
        error={error}
        onLogout={logout}
        onCapture={() => navigate("foto-checkin")}
      />
    );
  }

  return (
    <LoginPage
      busy={busy}
      error={error}
      message={message}
      onSubmit={(email, password) =>
        act(async () => {
          setUser(await client.login(email, password));
        })
      }
    />
  );
}

export default App;
