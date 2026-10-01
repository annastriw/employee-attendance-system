import { Button, Dropdown, Label } from "@heroui/react";
import { SignOut } from "@phosphor-icons/react";

function initials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase() || "A";
}

export function AccountMenu({ email, busy, onLogout }: {
  email: string;
  busy: boolean;
  onLogout: () => Promise<void>;
}) {
  return (
    <Dropdown>
      <Button variant="ghost" isIconOnly isDisabled={busy} aria-label="Menu akun" className="account-trigger">
        <span className="avatar" aria-hidden="true">{initials(email)}</span>
      </Button>
      <Dropdown.Popover className="account-popover" placement="bottom end">
        <div className="account-header">
          <span className="avatar" aria-hidden="true">{initials(email)}</span>
          <div className="account-identity">
            <strong>Admin HRD</strong>
            <span className="account-email">{email}</span>
          </div>
        </div>
        <Dropdown.Menu aria-label="Tindakan akun" onAction={() => { void onLogout(); }}>
          <Dropdown.Item id="logout" textValue="Keluar">
            <SignOut size={16} aria-hidden="true" />
            <Label>{busy ? "Keluar…" : "Keluar"}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
