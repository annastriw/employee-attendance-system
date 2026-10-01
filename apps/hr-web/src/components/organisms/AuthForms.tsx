import { useState, type SubmitEvent } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { PasswordField } from "../molecules/PasswordField";
import { Notice } from "../molecules/Notice";
const bytes = (value: string) => new TextEncoder().encode(value).length;
interface LoginProps {
  busy: boolean;
  error: string;
  onSubmit: (email: string, password: string) => Promise<void>;
}
export function LoginForm({ busy, error, onSubmit }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validation, setValidation] = useState("");
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !password ||
      bytes(password) > 72
    ) {
      setValidation("Masukkan email yang valid dan password maksimal 72 byte.");
      return;
    }
    setValidation("");
    await onSubmit(email.trim(), password);
  }
  return (
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
      <TextField
        className="form-field"
        value={email}
        onChange={setEmail}
        isRequired
        isDisabled={busy}
        validationBehavior="aria"
      >
        <Label>Email</Label>
        <Input
          type="email"
          autoComplete="username"
          placeholder="nama@perusahaan.com"
        />
      </TextField>
      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        disabled={busy}
      />
      {(validation || error) && <Notice message={validation || error} />}
      <Button type="submit" className="primary-button" isDisabled={busy}>
        {busy ? "Sedang masuk…" : "Masuk"}
      </Button>
      <p className="auth-help">
        Belum punya akun atau lupa password? Hubungi admin HRD.
      </p>
    </form>
  );
}
interface ChangeProps {
  busy: boolean;
  error: string;
  onSubmit: (current: string, replacement: string) => Promise<void>;
  onLogout: () => Promise<void>;
}
export function ChangePasswordForm({
  busy,
  error,
  onSubmit,
  onLogout,
}: ChangeProps) {
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
      setValidation(
        "Gunakan password baru yang berbeda dari password saat ini.",
      );
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
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
      <PasswordField
        label="Password saat ini"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        disabled={busy}
      />
      <PasswordField
        label="Password baru"
        value={replacement}
        onChange={setReplacement}
        autoComplete="new-password"
        description="Minimal 12 karakter, maksimal 72 byte."
        disabled={busy}
      />
      <PasswordField
        label="Konfirmasi password baru"
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
        disabled={busy}
      />
      {(validation || error) && <Notice message={validation || error} />}
      <Button type="submit" className="primary-button" isDisabled={busy}>
        {busy ? "Menyimpan…" : "Simpan password"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        isDisabled={busy}
        onPress={() => {
          void onLogout();
        }}
      >
        Keluar dari akun
      </Button>
    </form>
  );
}
