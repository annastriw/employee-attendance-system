import { useState, type SubmitEvent } from 'react';
import { Button } from '@heroui/react';
import { Notice } from './Notice';
import { PasswordField } from './PasswordField';
import { passwordChangeError } from '../lib/password-change';

export function ChangePasswordForm({ busy, error, onSubmit, onLogout }: {
  busy: boolean; error: string;
  onSubmit: (current: string, replacement: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [current, setCurrent] = useState('');
  const [replacement, setReplacement] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validation, setValidation] = useState('');
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = passwordChangeError(current, replacement, confirmation);
    if (message) { setValidation(message); return; }
    setValidation('');
    await onSubmit(current, replacement);
  }
  return <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
    <PasswordField label="Password saat ini" value={current} onChange={value => { setCurrent(value); setValidation(''); }} autoComplete="current-password" disabled={busy} />
    <PasswordField label="Password baru" value={replacement} onChange={value => { setReplacement(value); setValidation(''); }} autoComplete="new-password" description="Minimal 12 karakter, maksimal 72 byte." disabled={busy} />
    <PasswordField label="Konfirmasi password baru" value={confirmation} onChange={value => { setConfirmation(value); setValidation(''); }} autoComplete="new-password" disabled={busy} />
    {(validation || error) && <Notice message={validation || error} />}
    <Button type="submit" className="primary-button" isDisabled={busy}>{busy ? 'Menyimpan…' : 'Simpan password'}</Button>
    <Button type="button" variant="ghost" isDisabled={busy} onPress={() => { void onLogout(); }}>Keluar dari akun</Button>
  </form>;
}
