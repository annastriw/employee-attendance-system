import type { ReactNode } from "react";
import { Button, Drawer, useOverlayState } from "@heroui/react";
import { SidebarSimple, X } from "@phosphor-icons/react";

/** Shared responsive shell: persistent desktop rail and accessible mobile drawer. */
export function SidebarShell({ brand, navigation, footer, collapsed, onToggle, open, onOpenChange, drawerId = "workspace-navigation-drawer" }: {
  brand: ReactNode; navigation: ReactNode; footer: ReactNode;
  collapsed: boolean; onToggle: () => void; open: boolean; onOpenChange: (open: boolean) => void;
  drawerId?: string;
}) {
  const drawerState = useOverlayState({ isOpen: open, onOpenChange });
  return <>
    <aside className="workspace-sidebar" data-collapsed={collapsed}>
      <div className="workspace-sidebar-header"><div className="workspace-brand">{brand}</div>
      <Button size="sm" variant="ghost" isIconOnly className="workspace-sidebar-collapse"
        aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        aria-expanded={!collapsed} aria-controls={`${drawerId}-desktop`} onPress={onToggle}>
        <SidebarSimple size={18} aria-hidden="true" />
      </Button></div>
      <nav id={`${drawerId}-desktop`} className="workspace-navigation" aria-label="Navigasi utama">{navigation}</nav>
      <footer className="workspace-sidebar-footer">{footer}</footer>
    </aside>
    <Drawer state={drawerState}>
      <Drawer.Trigger className="workspace-drawer-state-trigger" aria-hidden="true">Open navigation</Drawer.Trigger>
      <Drawer.Backdrop className="workspace-drawer-backdrop">
        <Drawer.Content className="workspace-drawer" placement="left">
          <Drawer.Dialog id={drawerId} aria-label="Navigasi">
            <Drawer.Header className="workspace-drawer-header">
              {brand}
              <Drawer.CloseTrigger aria-label="Tutup navigasi"><X size={18} aria-hidden="true" /></Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="workspace-drawer-body">
              <nav className="workspace-navigation" aria-label="Navigasi utama">{navigation}</nav>
            </Drawer.Body>
            <Drawer.Footer className="workspace-drawer-footer">{footer}</Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  </>;
}
