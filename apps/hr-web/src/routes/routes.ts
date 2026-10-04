import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * The workspace views, kept identical to the previous hash router so every
 * destination, label and deep link stays the same. Each view now owns a real
 * URL path; filters and slugs live in search params instead of the hash query.
 */
export type View =
  | "ringkasan"
  | "departemen"
  | "jabatan"
  | "karyawan"
  | "hari-libur"
  | "absensi"
  | "absensi-dihapus";

export const VIEWS: View[] = [
  "ringkasan",
  "departemen",
  "jabatan",
  "karyawan",
  "hari-libur",
  "absensi",
  "absensi-dihapus",
];

/** Path segment for each view. The segment equals the view slug by design. */
export const viewPath = (view: View): string => `/${view}`;

/** Authentication screens live outside the workspace shell. */
export const LOGIN_PATH = "/masuk";
export const CHANGE_PASSWORD_PATH = "/ganti-password";

/**
 * Adapts React Router search params to the `{ params, onParamsChange }`
 * contract every page already consumes. `onParamsChange` replaces the full
 * query for the current path, matching the previous navigate() semantics
 * (a page rebuilds the complete set of params it wants to keep). Updates use
 * replace navigation so filter changes do not flood the history stack, exactly
 * as the hash router did with history.replaceState.
 */
export function useRouteParams() {
  const [params, setParams] = useSearchParams();
  const onParamsChange = useCallback(
    (next: Record<string, string | undefined>) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value) query.set(key, value);
      }
      setParams(query, { replace: true });
    },
    [setParams],
  );
  return { params, onParamsChange };
}
