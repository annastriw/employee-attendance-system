import { Button, Dropdown, Label } from "@heroui/react";
export function AccountMenu({ email, busy, onLogout }: {
  email: string;
  busy: boolean;
  onLogout: () => Promise<void>;
}) {
  return (
    <Dropdown>
      <Button variant="ghost" isDisabled={busy} aria-label="Menu akun">
        {busy ? "Keluar…" : "Akun"}
      </Button>
      <Dropdown.Popover className="account-popover">
        <p className="account-email">{email}</p>
        <Dropdown.Menu aria-label="Tindakan akun" onAction={() => { void onLogout(); }}>
          <Dropdown.Item id="logout" textValue="Keluar"><Label>Keluar</Label></Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
