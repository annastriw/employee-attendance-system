import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function getStoredPreference(): ThemePreference {
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    if (pref === "light" || pref === "dark") return pref;
  } catch {
    /* localStorage unavailable */
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  return prefersDark() ? "dark" : "light";
}

export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.dataset.theme = resolved;
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(resolveTheme(pref));
}

/**
 * Theme controller hook shared by both portals.
 * Mirrors the pre-paint head script, then keeps the DOM in sync with the
 * stored preference, OS changes (while on "system"), and other tabs.
 */
export function useTheme() {
  const [preference, setPref] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : getStoredPreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "light" : resolveTheme(preference),
  );

  const setTheme = useCallback((pref: ThemePreference) => {
    setThemePreference(pref);
    setPref(pref);
    setResolved(resolveTheme(pref));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = () => {
      if (getStoredPreference() === "system") {
        applyTheme(resolveTheme("system"));
        setResolved(resolveTheme("system"));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = getStoredPreference();
        setPref(next);
        applyTheme(resolveTheme(next));
        setResolved(resolveTheme(next));
      }
    };
    media.addEventListener("change", onOsChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onOsChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { preference, resolved, setTheme };
}
