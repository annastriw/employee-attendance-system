type BadgeStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

const LABELS: Record<BadgeStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  ARCHIVED: "Arsip",
};

const VARIANTS: Record<BadgeStatus, string> = {
  ACTIVE: "status-active",
  INACTIVE: "status-inactive",
  ARCHIVED: "status-archived",
};

/**
 * Status pill shared across HR list and detail views. Renders a dot + label
 * for an employee or master-data status. ARCHIVED is a distinct, muted-strong
 * variant so archived employees read as a terminal state, not merely inactive.
 */
export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span className={`status-badge ${VARIANTS[status]}`}>
      <span className="status-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
