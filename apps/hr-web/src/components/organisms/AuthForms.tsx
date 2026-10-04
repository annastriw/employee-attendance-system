import { useState, type SubmitEvent } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { PasswordField, Notice } from "@attendance/ui";

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
export { ChangePasswordForm } from "@attendance/ui";
