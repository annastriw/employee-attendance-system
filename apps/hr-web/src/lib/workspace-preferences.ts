export const SIDEBAR_COLLAPSED_KEY = "hr-sidebar-collapsed";

/** Match route segments, so absensi does not also match absensi-dihapus. */
export function isWorkspacePath(pathname: string, destination: string): boolean {
  return pathname === destination || pathname.startsWith(destination + "/");
}

export function readSidebarCollapsed(storage: Storage): boolean {
  try { return storage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"; }
  catch { return false; }
}

export function writeSidebarCollapsed(storage: Storage, collapsed: boolean): void {
  try {
    if (collapsed) storage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
    else storage.removeItem(SIDEBAR_COLLAPSED_KEY);
  } catch { /* Private browsing can disable storage; the in-memory setting still works. */ }
}

export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest('[contenteditable="true"]') !== null || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
