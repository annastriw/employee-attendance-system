import { ChartBar } from "@phosphor-icons/react";
import { Notice } from "../components/molecules/Notice";
import { WorkspaceLayout } from "../components/templates/WorkspaceLayout";
import type { AdminUser, AuthClient } from "../lib/auth-client";
import { useHashRoute } from "../lib/use-hash-route";
import { DepartmentsPage } from "./DepartmentsPage";

import { PositionsPage } from "./PositionsPage";

const TITLES = { ringkasan: "Ringkasan", departemen: "Departemen", jabatan: "Jabatan" } as const;

export function DashboardPage({ user, client, busy, error, onLogout, onSessionExpired }: {
  user: AdminUser;
  client: Pick<AuthClient, "api">;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const { view, params, navigate } = useHashRoute();
  return (
    <WorkspaceLayout view={view} title={TITLES[view]} email={user.email} busy={busy} onLogout={onLogout}>
      {error && <Notice message={error} />}
      {view === "departemen" ? (
        <DepartmentsPage client={client} params={params} onSessionExpired={onSessionExpired}
          onParamsChange={(next) => navigate("departemen", next)} />
      ) : view === "jabatan" ? (
        <PositionsPage client={client} params={params} onSessionExpired={onSessionExpired}
          onParamsChange={(next) => navigate("jabatan", next)} />
      ) : (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true"><ChartBar size={22} /></span>
          <p className="empty-title">Belum ada data yang ditampilkan</p>
          <p className="empty-body">Ringkasan kehadiran muncul setelah karyawan mulai melakukan absensi.</p>
        </div>
      )}
    </WorkspaceLayout>
  );
}
