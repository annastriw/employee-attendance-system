import { useCallback, useEffect, useState } from "react";

export type View =
  | "masuk"
  | "ganti-password"
  | "beranda"
  | "foto-checkin"
  | "foto-checkout"
  | "riwayat";
const views: View[] = [
  "masuk",
  "ganti-password",
  "beranda",
  "foto-checkin",
  "foto-checkout",
  "riwayat",
];

function read() {
  const [value, query = ""] = window.location.hash.replace(/^#/, "").split("?");
  return {
    view: views.includes(value as View) ? (value as View) : ("masuk" as View),
    params: new URLSearchParams(query),
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = useCallback(
    (next: View, values?: Record<string, string | undefined>) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(values ?? {}))
        if (value) query.set(key, value);
      const hash = "#" + next + (query.size ? "?" + query.toString() : "");
      if (window.location.hash !== hash)
        window.history.replaceState(null, "", hash);
      setRoute(read());
    },
    [],
  );
  return { ...route, navigate };
}
