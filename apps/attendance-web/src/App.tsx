import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BrowserRouter, matchPath, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Clock } from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { AuthShell } from "@attendance/ui";
import { authClient, AuthError, type AuthClient, type EmployeeUser } from "./lib/auth-client";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import HistoryPage from "./pages/HistoryPage";
import { ProfilePage } from "./pages/ProfilePage";
import CapturePage from "./pages/CapturePage";
import { EmployeeWorkspace } from "./components/templates/EmployeeWorkspace";
import { clearPendingCheckIn } from "./features/checkin/use-check-in";

function RoutedApp({ client }: { client: AuthClient }) {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useMemo(() => new URLSearchParams(searchParams), [searchParams]);

  useEffect(() => {
    let active = true;
    client.restore().then(value => { if (active) setUser(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Sesi tidak dapat dipulihkan.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (location.pathname !== "/masuk") navigate("/masuk", { replace: true });
    } else if (user.mustChangePassword) {
      if (location.pathname !== "/ganti-password") navigate("/ganti-password", { replace: true });
    } else if (["/masuk", "/ganti-password"].includes(location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  const sessionExpired = useCallback(() => {
    clearPendingCheckIn(client);
    setUser(null);
    setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
    navigate("/masuk", { replace: true });
  }, [client, navigate]);

  const act = useCallback(async (action: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Terjadi kesalahan. Coba lagi.");
      if (reason instanceof AuthError && reason.status === 401 && user) sessionExpired();
    } finally { setBusy(false); }
  }, [user, sessionExpired]);
  const logout = useCallback(() => act(async () => {
    await client.logout(); clearPendingCheckIn(client); setUser(null); navigate("/masuk", { replace: true });
  }), [act, client, navigate]);

  function onHistoryParamsChange(next: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (key !== "id" && value) query.set(key, value);
    const base = next.id ? `/riwayat/${encodeURIComponent(next.id)}` : "/riwayat";
    const suffix = query.size ? `?${query.toString()}` : "";
    navigate(base + suffix, { replace: !next.id });
  }

  if (loading) return <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}><p role="status" className="loading-session">Memeriksa sesi Anda…</p></AuthShell>;
  if (!user) return <LoginPage busy={busy} error={error} message={message} onSubmit={(email, password) => act(async () => {
    const loggedIn = await client.login(email, password);
    setUser(loggedIn); navigate(loggedIn.mustChangePassword ? "/ganti-password" : "/", { replace: true });
  })} />;
  if (user.mustChangePassword) return <ChangePasswordPage user={user} busy={busy} error={error} onLogout={logout} onSubmit={(current, replacement) => act(async () => {
    await client.changePassword(current, replacement); setUser(null); setMessage("Password berhasil diperbarui. Silakan masuk dengan password baru."); navigate("/masuk", { replace: true });
  })} />;

  const historyMatch = matchPath("/riwayat/:recordId", location.pathname);
  const capturePurpose = location.pathname === "/absen/masuk" ? "CHECK_IN" : location.pathname === "/absen/pulang" ? "CHECK_OUT" : null;
  if (capturePurpose) return <CapturePage key={capturePurpose} purpose={capturePurpose} client={client} onBack={() => navigate("/")} onSessionExpired={sessionExpired} />;

  let page: ReactNode;
  if (location.pathname === "/") page = <HomePage client={client} user={user} busy={busy} error={error} onCapture={purpose => navigate(purpose === "CHECK_OUT" ? "/absen/pulang" : "/absen/masuk")} onSessionExpired={sessionExpired} onHistory={() => navigate("/riwayat")} />;
  else if (location.pathname === "/riwayat" || historyMatch) page = <HistoryPage client={client} params={params} recordId={historyMatch?.params.recordId} onParamsChange={onHistoryParamsChange} onHome={() => navigate("/")} onSessionExpired={sessionExpired} />;
  else if (location.pathname === "/profil") page = <ProfilePage client={client} user={user} busy={busy} error={error} onHome={() => navigate("/")} onLogout={logout} onSessionExpired={sessionExpired} onChangePassword={(current, replacement) => act(async () => {
    await client.changePassword(current, replacement); setUser(null); setMessage("Password berhasil diperbarui. Silakan masuk dengan password baru."); navigate("/masuk", { replace: true });
  })} />;
  else page = <section className="employee-not-found"><h1>Halaman tidak ditemukan</h1><p>Alamat ini tidak tersedia.</p><Button variant="secondary" onPress={() => navigate("/", { replace: true })}>Kembali ke Hari ini</Button></section>;

  return <EmployeeWorkspace user={user} busy={busy} onLogout={logout}>{page}</EmployeeWorkspace>;
}

export function App({ client = authClient, router }: { client?: AuthClient; router?: (children: ReactNode) => ReactNode }) {
  const withRouter = router ?? ((children: ReactNode) => <BrowserRouter>{children}</BrowserRouter>);
  return withRouter(<RoutedApp client={client} />);
}

export default App;
