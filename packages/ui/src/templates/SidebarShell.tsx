import type { ReactNode } from "react";
import { Button, Drawer, useOverlayState } from "@heroui/react";
import { SidebarSimple, X } from "@phosphor-icons/react";

/** Shared responsive shell: persistent desktop rail and accessible mobile drawer. */
export function SidebarShell({ brand, navigation, footer, collapsed, onToggle, open, onOpenChange }: {
  brand: ReactNode; navigation: ReactNode; footer: ReactNode;
  collapsed: boolean; onToggle: () => void; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const drawerState = useOverlayState({ isOpen: open, onOpenChange });
  return <>
    <aside className="dashboard-sidebar" data-collapsed={collapsed}>
      <div className="sidebar-brand">{brand}</div>
      <Button size="sm" variant="ghost" isIconOnly className="sidebar-collapse"
        aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        aria-expanded={!collapsed} aria-controls="desktop-navigation" onPress={onToggle}>
        <SidebarSimple size={18} aria-hidden="true" />
      </Button>
      <nav id="desktop-navigation" className="sidebar-navigation" aria-label="Navigasi utama">{navigation}</nav>
      <footer className="sidebar-footer">{footer}</footer>
    </aside>
    <Drawer state={drawerState}>
      <Drawer.Trigger className="sidebar-drawer-state-trigger" aria-hidden="true">Open navigation</Drawer.Trigger>
      <Drawer.Backdrop className="sidebar-drawer-backdrop">
        <Drawer.Content className="sidebar-drawer" placement="left">
          <Drawer.Dialog id="hr-navigation-drawer" aria-label="Navigasi">
            <Drawer.Header className="sidebar-drawer-header">
              {brand}
              <Drawer.CloseTrigger aria-label="Tutup navigasi"><X size={18} aria-hidden="true" /></Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="sidebar-drawer-body">
              <nav className="sidebar-navigation" aria-label="Navigasi utama">{navigation}</nav>
            </Drawer.Body>
            <Drawer.Footer className="sidebar-drawer-footer">{footer}</Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  </>;
}
