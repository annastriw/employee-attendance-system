import { Button, Dropdown, Label } from "@heroui/react";
import { SignOut, UserCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

function initials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase() || "A";
}

export function WorkspaceAccountMenu({ email, busy, onLogout, onProfile, roleLabel = "Admin HRD", client, onSessionExpired }: {
  roleLabel?: string;
  email: string;
  busy: boolean;
  onLogout: () => Promise<void>;
  onProfile?: () => void;
  client?: { api: <T>(path: string) => Promise<T> };
  onSessionExpired?: () => void;
}) {
  const [identity, setIdentity] = useState<{ email: string; name: string } | null>(null);
  const expired = useRef(onSessionExpired);
  useEffect(() => { expired.current = onSessionExpired; }, [onSessionExpired]);
  useEffect(() => {
    if (!client) return;
    let active = true;
    client.api<{ data: { name: string } | null }>("me/profile").then(result => {
      if (active) setIdentity({ email, name: result?.data?.name?.trim() || roleLabel });
    }).catch((error: unknown) => {
      if (!active) return;
      setIdentity(null);
      if (error && typeof error === "object" && "status" in error && error.status === 401) expired.current?.();
    });
    return () => { active = false; };
  }, [client, email, roleLabel]);
  const name = identity?.email === email ? identity.name : roleLabel;
  return (
    <Dropdown>
      <Button variant="ghost" isDisabled={busy} aria-label="Menu akun" className="account-trigger">
        <span className="avatar" aria-hidden="true">{initials(email)}</span>
        <span className="account-identity"><strong>{name}</strong><span className="account-email">{email}</span></span>
      </Button>
      <Dropdown.Popover className="account-popover" placement="bottom end">
        <div className="account-header">
          <span className="avatar" aria-hidden="true">{initials(email)}</span>
          <div className="account-identity">
            <strong>{name}</strong>
            <span className="account-email">{email}</span>
          </div>
        </div>
        <Dropdown.Menu aria-label="Tindakan akun" disabledKeys={busy ? ["profile", "logout"] : []}
          onAction={key => { if (busy) return; if (key === "profile") onProfile?.(); else if (key === "logout") void onLogout(); }}>
          {onProfile && <Dropdown.Item id="profile" textValue="Profil">
            <UserCircle size={16} aria-hidden="true" />
            <Label>Profil</Label>
          </Dropdown.Item>}
          <Dropdown.Item id="logout" textValue="Keluar">
            <SignOut size={16} aria-hidden="true" />
            <Label>{busy ? "Keluar…" : "Keluar"}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
