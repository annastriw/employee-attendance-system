import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { List, SidebarSimple } from "@phosphor-icons/react";
import { SidebarShell } from "./SidebarShell";
import { ThemeToggle } from "../molecules/ThemeToggle";

/** One workspace for both roles. Routing and role destinations belong to each app. */
export function WorkspaceShell({ brand, title, pathname, storageKey, navigation, account, actions, children }: {
  brand: ReactNode; title: string; pathname: string; storageKey: string;
  navigation: (close: () => void) => ReactNode; account: ReactNode;
  actions?: ReactNode; children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem(storageKey) === "true"; }
    catch { return false; }
  });
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  if (openedAt !== null && openedAt !== pathname) setOpenedAt(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  useEffect(() => {
    try {
      if (collapsed) window.localStorage.setItem(storageKey, "true");
      else window.localStorage.removeItem(storageKey);
    } catch { /* Storage can be disabled in private browsing. */ }
  }, [collapsed, storageKey]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const resized = () => { if (desktop.matches) setOpenedAt(null); };
    desktop.addEventListener("change", resized);
    return () => desktop.removeEventListener("change", resized);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"));
      if (event.key === "[" && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setCollapsed(value => !value);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const close = () => {
    setOpenedAt(null);
    if (open) requestAnimationFrame(() => toggle.current?.focus());
  };
  return <div className="workspace-shell" data-sidebar-collapsed={collapsed}>
      <header className="workspace-header">
        <div className="workspace-heading">
          <Button ref={toggle} variant="ghost" isIconOnly className="workspace-menu-toggle"
            aria-label="Menu navigasi" aria-expanded={open} aria-controls={drawerId}
            onPress={() => open ? close() : setOpenedAt(pathname)}><List size={18} aria-hidden="true" /></Button>
          <Button size="sm" variant="ghost" isIconOnly className="workspace-sidebar-collapse"
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed} aria-controls={`${drawerId}-desktop`} onPress={() => setCollapsed(value => !value)}>
            <SidebarSimple size={18} aria-hidden="true" />
          </Button>
          <div className="workspace-header-brand">{brand}</div>
          <span className="workspace-context-title">{title}</span>
        </div>
        <div className="workspace-header-actions">{actions}<ThemeToggle />{account}</div>
      </header>
    <SidebarShell navigation={navigation(close)} collapsed={collapsed} open={open}
      drawerId={drawerId} onOpenChange={value => value ? setOpenedAt(pathname) : close()} />
    <div className="workspace-main">
      <main id="konten" className="workspace-content" aria-label={title}>{children}</main>
    </div>
  </div>;
}
