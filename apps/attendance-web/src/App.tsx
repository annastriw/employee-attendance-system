import { lazy, Suspense, useCallback, useEffect, useState } from "react";
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

import { clearPendingCheckIn } from "./features/checkin/use-check-in";
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const CapturePage = lazy(() => import("./pages/CapturePage"));

export function App({ client = authClient }: { client?: AuthClient }) {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { view, params, navigate } = useHashRoute();

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
      !(
        required === "beranda" &&
        ["foto-checkin", "foto-checkout", "riwayat"].includes(view)
      )
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
        clearPendingCheckIn(client);
        setUser(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const sessionExpired = useCallback(() => {
    clearPendingCheckIn(client);
    setUser(null);
    setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
  }, [client]);
  const logout = () =>
    act(async () => {
      await client.logout();
      clearPendingCheckIn(client);
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
    if (view === "riwayat")
      return (
        <Suspense
          fallback={
            <AuthShell
              name="Attendance Portal"
              brandIcon={<Clock size={16} weight="bold" />}
            >
              <p role="status">Memuat riwayat…</p>
            </AuthShell>
          }
        >
          <HistoryPage
            client={client}
            params={params}
            onParamsChange={(next) => navigate("riwayat", next)}
            onHome={() => navigate("beranda")}
            onSessionExpired={sessionExpired}
          />
        </Suspense>
      );
    if (["foto-checkin", "foto-checkout"].includes(view))
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
            key={view}
            purpose={view === "foto-checkout" ? "CHECK_OUT" : "CHECK_IN"}
            client={client}
            onBack={() => navigate("beranda")}
            onSessionExpired={sessionExpired}
          />
        </Suspense>
      );
    return (
      <HomePage
        client={client}
        onSessionExpired={sessionExpired}
        user={user}
        busy={busy}
        error={error}
        onLogout={logout}
        onHistory={() => navigate("riwayat")}
        onCapture={(purpose) =>
          navigate(purpose === "CHECK_OUT" ? "foto-checkout" : "foto-checkin")
        }
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
