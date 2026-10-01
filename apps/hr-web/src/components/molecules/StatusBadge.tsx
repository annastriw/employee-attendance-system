import type { MasterStatus } from "../../lib/departments";

export function StatusBadge({ status }: { status: MasterStatus }) {
  const active = status === "ACTIVE";
  return (
    <span className={`status-badge ${active ? "status-active" : "status-inactive"}`}>
      <span className="status-dot" aria-hidden="true" />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
