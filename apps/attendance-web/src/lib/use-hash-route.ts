import { useCallback, useEffect, useState } from "react";

export type View =
  "masuk" | "ganti-password" | "beranda" | "foto-checkin" | "foto-checkout";
const views: View[] = [
  "masuk",
  "ganti-password",
  "beranda",
  "foto-checkin",
  "foto-checkout",
];

function read(): View {
  const value = window.location.hash.replace(/^#/, "");
  return views.includes(value as View) ? (value as View) : "masuk";
}

export function useHashRoute() {
  const [view, setView] = useState(read);
  useEffect(() => {
    const update = () => setView(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = useCallback((next: View) => {
    if (window.location.hash !== "#" + next) {
      window.history.replaceState(null, "", "#" + next);
    }
    setView(next);
  }, []);

  return { view, navigate };
}
