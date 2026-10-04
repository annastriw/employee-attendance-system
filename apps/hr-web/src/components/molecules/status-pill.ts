import type { MonitoringEmployeeItem } from "../../lib/monitoring";

/** Visual tone for a status pill, mapped to the shared status-badge classes. */
export type PillTone = "active" | "inactive" | "archived";

export const PILL_TONE_CLASS: Record<PillTone, string> = {
  active: "status-active",
  inactive: "status-inactive",
  archived: "status-archived",
};

/** Maps a monitoring attendance status to a pill tone. */
export function monitoringTone(
  status: MonitoringEmployeeItem["status"],
): PillTone {
  switch (status) {
    case "COMPLETED":
    case "CHECKED_IN":
      return "active";
    case "MISSING":
    case "DELETED":
      return "archived";
    default:
      return "inactive";
  }
}

/** Tone for the active/deleted-or-done state used by the attendance list. */
export function attendanceTone(deleted: boolean): PillTone {
  return deleted ? "archived" : "inactive";
}
