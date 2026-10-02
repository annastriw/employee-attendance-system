import { useCallback, useEffect, useState } from "react";

export type View = "ringkasan" | "departemen" | "jabatan" | "karyawan";
const VIEWS: View[] = ["ringkasan", "departemen", "jabatan", "karyawan"];

function read() {
  const [rawView, rawQuery = ""] = window.location.hash.replace(/^#/, "").split("?");
  const view = (VIEWS as string[]).includes(rawView) ? (rawView as View) : "ringkasan";
  return { view, params: new URLSearchParams(rawQuery) };
}

/** Hash routing keeps the page and its filters in the URL without a router dependency. */
export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigate = useCallback((view: View, params?: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) if (value) query.set(key, value);
    const hash = `#${view}${query.size ? "?" + query : ""}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    setRoute(read());
  }, []);
  return { ...route, navigate };
}
