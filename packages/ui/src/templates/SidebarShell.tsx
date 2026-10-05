import type { ReactNode } from "react";
import { Drawer, useOverlayState } from "@heroui/react";
import { X } from "@phosphor-icons/react";

/** Shared responsive shell: persistent desktop rail and accessible mobile drawer. */
export function SidebarShell({ navigation, collapsed, open, onOpenChange, drawerId = "workspace-navigation-drawer" }: {
  navigation: ReactNode;
  collapsed: boolean; open: boolean; onOpenChange: (open: boolean) => void;
  drawerId?: string;
}) {
  const drawerState = useOverlayState({ isOpen: open, onOpenChange });
  return <>
    <aside className="workspace-sidebar" data-collapsed={collapsed}>
      <nav id={`${drawerId}-desktop`} className="workspace-navigation" aria-label="Navigasi utama">{navigation}</nav>
    </aside>
    <Drawer state={drawerState}>
      <Drawer.Trigger className="workspace-drawer-state-trigger" aria-hidden="true">Open navigation</Drawer.Trigger>
      <Drawer.Backdrop className="workspace-drawer-backdrop">
        <Drawer.Content className="workspace-drawer" placement="left">
          <Drawer.Dialog id={drawerId} aria-label="Navigasi">
            <Drawer.Header className="workspace-drawer-header">
              <span>Navigasi</span>
              <Drawer.CloseTrigger aria-label="Tutup navigasi"><X size={18} aria-hidden="true" /></Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="workspace-drawer-body">
              <nav className="workspace-navigation" aria-label="Navigasi utama">{navigation}</nav>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  </>;
}
