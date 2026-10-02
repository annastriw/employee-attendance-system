import { useState, type SubmitEvent } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Clock } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { Notice } from "../components/molecules/Notice";
import { PasswordField } from "../components/molecules/PasswordField";

const bytes = (value: string) => new TextEncoder().encode(value).length;

interface Props {
  busy: boolean;
  error: string;
  message: string;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ busy, error, message, onSubmit }: Props) {
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
    <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}>
      <h1>Masuk</h1>
      <p className="page-intro">Gunakan akun karyawan Anda.</p>
      {message && <Notice message={message} success />}
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
        <TextField
          className="form-field"
          value={email}
          onChange={(next) => { setEmail(next); setValidation(""); }}
          isRequired
          isDisabled={busy}
          validationBehavior="aria"
        >
          <Label>Email</Label>
          <Input type="email" autoComplete="username" placeholder="nama@perusahaan.com" />
        </TextField>
        <PasswordField
          label="Password"
          value={password}
          onChange={(next) => { setPassword(next); setValidation(""); }}
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
    </AuthShell>
  );
}