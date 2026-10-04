import { useState, type SubmitEvent } from "react";
import { Button } from "@heroui/react";
import { Clock } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { Notice } from "../components/molecules/Notice";
import { PasswordField } from "../components/molecules/PasswordField";
import type { EmployeeUser } from "../lib/auth-client";

const bytes = (value: string) => new TextEncoder().encode(value).length;

interface Props {
  user: EmployeeUser;
  busy: boolean;
  error: string;
  onSubmit: (current: string, replacement: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function ChangePasswordPage({ user, busy, error, onSubmit, onLogout }: Props) {
  const [current, setCurrent] = useState("");
  const [replacement, setReplacement] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState("");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !current ||
      bytes(current) > 72 ||
      Array.from(replacement).length < 12 ||
      bytes(replacement) > 72
    ) {
      setValidation(
        "Isi password saat ini dan gunakan password baru minimal 12 karakter, maksimal 72 byte.",
      );
      return;
    }
    if (replacement === current) {
      setValidation("Gunakan password baru yang berbeda dari password saat ini.");
      return;
    }
    if (replacement !== confirmation) {
      setValidation("Konfirmasi password belum sama.");
      return;
    }
    setValidation("");
    await onSubmit(current, replacement);
  }

  return (
    <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}>
      <h1>Buat password baru</h1>
      <p className="page-intro">
        Ganti password awal untuk melanjutkan. Setelah tersimpan, masuk kembali.
      </p>
      <p className="signed-in-email">{user.email}</p>
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
        <PasswordField
          label="Password saat ini"
          value={current}
          onChange={(next) => { setCurrent(next); setValidation(""); }}
          autoComplete="current-password"
          disabled={busy}
        />
        <PasswordField
          label="Password baru"
          value={replacement}
          onChange={(next) => { setReplacement(next); setValidation(""); }}
          autoComplete="new-password"
          description="Minimal 12 karakter, maksimal 72 byte."
          disabled={busy}
        />
        <PasswordField
          label="Konfirmasi password baru"
          value={confirmation}
          onChange={(next) => { setConfirmation(next); setValidation(""); }}
          autoComplete="new-password"
          disabled={busy}
        />
        {(validation || error) && <Notice message={validation || error} />}
        <Button type="submit" className="primary-button" isDisabled={busy}>
          {busy ? "Menyimpan…" : "Simpan password"}
        </Button>
        <Button type="button" variant="ghost" isDisabled={busy} onPress={() => { void onLogout(); }}>
          Keluar dari akun
        </Button>
      </form>
    </AuthShell>
  );
}