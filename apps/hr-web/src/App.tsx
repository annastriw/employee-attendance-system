import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import type { ReactNode } from "react";
import { WorkspaceLayout } from "./components/templates/WorkspaceLayout";
import { AuthProvider } from "./routes/AuthProvider";
import { RequireAuth } from "./routes/RequireAuth";
import { LoginRoute } from "./routes/LoginRoute";
import { ChangePasswordRoute } from "./routes/ChangePasswordRoute";
import { NotFoundRoute } from "./routes/NotFoundRoute";
import {
  AbsensiRoute,
  DepartemenRoute,
  HariLiburRoute,
  JabatanRoute,
  KaryawanRoute,
  RingkasanRoute,
  ProfileRoute,
} from "./routes/ViewRoutes";
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, PROFILE_PATH, viewPath } from "./routes/routes";
import type { AuthClient } from "./lib/auth-client";

/** The route tree, shared between the real app and tests. */
function AppRoutes() {
  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginRoute />} />
      <Route path={CHANGE_PASSWORD_PATH} element={<ChangePasswordRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<WorkspaceLayout />}>
          <Route
            index
            element={<Navigate to={viewPath("ringkasan")} replace />}
          />
          <Route path={viewPath("ringkasan")} element={<RingkasanRoute />} />
          <Route path={viewPath("karyawan")} element={<KaryawanRoute />} />
          <Route path={viewPath("absensi")} element={<AbsensiRoute />} />
          <Route
            path={viewPath("absensi-dihapus")}
            element={<AbsensiRoute deleted />}
          />
          <Route path={viewPath("departemen")} element={<DepartemenRoute />} />
          <Route path={viewPath("jabatan")} element={<JabatanRoute />} />
          <Route path={viewPath("hari-libur")} element={<HariLiburRoute />} />
          <Route path={PROFILE_PATH} element={<ProfileRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}

/**
 * Application root: provides the auth session and the router. The optional
 * `client` lets tests inject a mock auth client, and `router` lets tests drive
 * routing with an in-memory history and a chosen initial path.
 */
export function App({
  client,
  router,
}: {
  client?: AuthClient;
  router?: (children: ReactNode) => ReactNode;
}) {
  const withRouter =
    router ??
    ((children: ReactNode) => <BrowserRouter>{children}</BrowserRouter>);
  return (
    <AuthProvider client={client}>{withRouter(<AppRoutes />)}</AuthProvider>
  );
}

export default App;
