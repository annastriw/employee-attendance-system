import { AttendancePage } from "../pages/AttendancePage";
import { EmployeesPage } from "../pages/EmployeesPage";
import { DepartmentsPage } from "../pages/DepartmentsPage";
import { PositionsPage } from "../pages/PositionsPage";
import { HolidaysPage } from "../pages/HolidaysPage";
import { MonitoringPage } from "../pages/MonitoringPage";
import { useAuth } from "./auth-context";
import { useRouteParams } from "./routes";

/**
 * Thin route wrappers. Each keeps the page component's existing contract
 * ({ client, params, onParamsChange, onSessionExpired }) intact so page
 * internals — filters, detail-within-view, pagination — are unchanged. The
 * session client and the session-expired handler come from the auth context;
 * URL filters/slugs come from the search-params adapter.
 */
export function RingkasanRoute() {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <MonitoringPage
      client={client}
      params={params}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}

export function KaryawanRoute() {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <EmployeesPage
      client={client}
      params={params}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}

export function AbsensiRoute({ deleted = false }: { deleted?: boolean }) {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <AttendancePage
      // Remount when switching between active and deleted so page state resets,
      // matching the previous per-view key.
      key={deleted ? "absensi-dihapus" : "absensi"}
      client={client}
      params={params}
      deleted={deleted}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}

export function DepartemenRoute() {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <DepartmentsPage
      client={client}
      params={params}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}

export function JabatanRoute() {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <PositionsPage
      client={client}
      params={params}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}

export function HariLiburRoute() {
  const { client, sessionExpired } = useAuth();
  const { params, onParamsChange } = useRouteParams();
  return (
    <HolidaysPage
      client={client}
      params={params}
      onParamsChange={onParamsChange}
      onSessionExpired={sessionExpired}
    />
  );
}
