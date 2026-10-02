import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { AuthError, type AuthClient } from '../lib/auth-client';
import { loadActiveMasters, type EmployeeDetail, type EmployeeInput, type EmailChangeOperation } from '../lib/employees';
import type { MasterRecord } from '../lib/master-data';
import { EmployeeForm } from '../components/organisms/EmployeeForm';
import { ConfirmDialog } from '../components/organisms/ConfirmDialog';
import { Notice } from '../components/molecules/Notice';
import { StatusBadge } from '../components/molecules/StatusBadge';

const failure = (reason: unknown) => reason instanceof Error ? reason.message : 'Terjadi kesalahan. Coba lagi.';
export function EmployeeDetailPage({ client, employeeId, onBack, onSessionExpired }: {
  client: Pick<AuthClient, 'api'>; employeeId: string; onBack: () => void; onSessionExpired: () => void;
}) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [masters, setMasters] = useState<{ departments: MasterRecord[]; positions: MasterRecord[] } | null>(null);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const submission = useRef<{ key: string; payload: string } | null>(null);
  const handle = useCallback((reason: unknown) => { if (reason instanceof AuthError && reason.status === 401) onSessionExpired(); return failure(reason); }, [onSessionExpired]);
  useEffect(() => {
    let active = true;
    Promise.all([client.api<EmployeeDetail>('employees/' + employeeId), loadActiveMasters(client, 'departments'), loadActiveMasters(client, 'positions')])
      .then(([value, departments, positions]) => {
        if (!active) return;
        setDetail(value); setLoadError('');
        setMasters({ departments: departments.some(row => row.id === value.departmentId) ? departments : [...departments, value.department],
          positions: positions.some(row => row.id === value.positionId) ? positions : [...positions, value.position] });
      }).catch((reason: unknown) => { if (active) setLoadError(handle(reason)); });
    return () => { active = false; };
  }, [client, employeeId, handle, reload]);
  const pendingId = detail?.emailChange?.status === 'PENDING' ? detail.emailChange.id : '';
  useEffect(() => {
    if (!pendingId) return;
    let active = true;
    const timer = setInterval(() => {
      client.api<EmailChangeOperation>('employee-email-changes/' + pendingId).then(value => {
        if (!active || value.status === 'PENDING') return;
        setDetail(current => current ? { ...current, emailChange: value } : current);
        submission.current = null;
        if (value.status === 'FAILED') setEmailError('Perubahan email ditolak. Email sudah digunakan atau akun berubah; muat ulang dan periksa email baru.');
        else { setNotice('Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.'); setNewEmail(''); }
        setReload(current => current + 1);
      }).catch((reason: unknown) => { if (active) setEmailError(handle(reason)); });
    }, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [client, handle, pendingId]);
  async function saveProfile(input: EmployeeInput) {
    if (!detail) return;
    setBusy(true); setProfileError(''); setNotice('');
    const profile = { nik: input.nik, name: input.name, phone: input.phone, departmentId: input.departmentId, positionId: input.positionId, startDate: input.startDate };
    try {
      const value = await client.api<EmployeeDetail>('employees/' + employeeId, { method: 'PATCH', body: { ...profile, expectedUpdatedAt: detail.updatedAt } });
      setDetail(value); setNotice('Profil berhasil disimpan.');
    } catch (reason) { setProfileError(handle(reason)); }
    finally { setBusy(false); }
  }
  function prepareEmail(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { setEmailError('Masukkan email baru yang valid.'); return; }
    if (email === detail?.email) { setEmailError('Gunakan email baru yang berbeda.'); return; }
    setNewEmail(email); setEmailError(''); setConfirmEmail(true);
  }
  function acceptOperation(value: EmailChangeOperation) {
    setDetail(current => current ? { ...current, emailChange: value } : current);
    setConfirmEmail(false);
    if (value.status !== 'PENDING') submission.current = null;
    if (value.status === 'FAILED') setEmailError('Perubahan email ditolak. Email sudah digunakan atau akun berubah; muat ulang dan periksa email baru.');
    if (value.status === 'COMPLETED') {
      setDetail(current => current ? { ...current, email: value.email } : current);
      setNotice('Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.'); setNewEmail('');
    }
    setReload(current => current + 1);
  }
  async function changeEmail() {
    if (!detail) return;
    const body = { email: newEmail, expectedEmail: detail.email };
    const payload = JSON.stringify(body);
    if (!submission.current || submission.current.payload !== payload) submission.current = { key: crypto.randomUUID(), payload };
    const key = submission.current.key;
    setBusy(true); setEmailError(''); setNotice('');
    try { acceptOperation(await client.api<EmailChangeOperation>('employees/' + employeeId + '/email', { method: 'POST', body, idempotencyKey: key })); }
    catch (reason) {
      setEmailError(handle(reason));
      try { acceptOperation(await client.api<EmailChangeOperation>('employee-email-changes/' + key)); }
      catch { /* An unaccepted request keeps the same key for an explicit retry. */ }
    } finally { setBusy(false); }
  }
  async function retryEmail() {
    if (!pendingId) return;
    setBusy(true); setEmailError('');
    try { acceptOperation(await client.api<EmailChangeOperation>('employee-email-changes/' + pendingId + '/retry', { method: 'POST' })); }
    catch (reason) { setEmailError(handle(reason)); }
    finally { setBusy(false); }
  }
  return <div className="employee-detail">
    <div className="employee-detail-header"><Button variant="tertiary" isDisabled={busy} onPress={onBack}><ArrowLeft size={16} aria-hidden="true" />Kembali</Button><h2>Profil karyawan</h2></div>
    {loadError ? <div className="load-error"><Notice message={loadError} /><Button variant="secondary" onPress={() => setReload(value => value + 1)}>Muat ulang</Button></div> : !detail || !masters ? <p role="status">Memuat profil karyawan…</p> : <>
      <div><p className="cell-strong">{detail.name}</p>{detail.status === 'ARCHIVED' ? <span className="status-badge status-inactive">Arsip</span> : <StatusBadge status={detail.status} />}</div>
      {notice && <Notice message={notice} success />}
      {detail.status === 'ARCHIVED' ? <p className="dialog-text">Karyawan arsip tidak dapat diedit.</p> : <>
        <EmployeeForm key={JSON.stringify([detail.nik, detail.name, detail.phone, detail.departmentId, detail.positionId, detail.startDate])} editing initial={{ ...detail, phone: detail.phone ?? '', status: detail.status }}
          departments={masters.departments} positions={masters.positions} busy={busy} error={profileError} onSubmit={input => void saveProfile(input)} onCancel={onBack} />
        {profileError && <Button variant="secondary" onPress={() => { setProfileError(''); setReload(value => value + 1); }}>Muat ulang profil</Button>}
        <form className="form-section" onSubmit={prepareEmail} noValidate aria-label="Ubah email karyawan">
          <h2>Akun</h2><p className="dialog-text">Email saat ini: <strong>{detail.email}</strong></p>
          {emailError && !confirmEmail && <Notice message={emailError} />}
          {pendingId ? <div className="provisioning-result"><p role="status">Sedang menyelesaikan perubahan ke {detail.emailChange?.email}.</p><Button variant="secondary" isDisabled={busy} onPress={() => void retryEmail()}>Lanjutkan perubahan email</Button></div> : <>
            <TextField className="form-field" value={newEmail} onChange={value => { setNewEmail(value); setEmailError(''); }} isRequired isDisabled={busy} validationBehavior="aria">
              <Label>Email baru</Label><Input type="email" autoComplete="off" maxLength={254} />
            </TextField>
            <p className="dialog-text">Sesi karyawan dicabut setelah email diubah. Karyawan masuk kembali dengan email baru dan password yang sama.</p>
            <div className="form-actions"><Button variant="primary" type="submit" isDisabled={busy}>Ubah email</Button></div>
          </>}
        </form>
      </>}
    </>}
    <ConfirmDialog open={confirmEmail} title="Ubah email karyawan?" confirmLabel="Ubah email" busy={busy} error={emailError} onClose={() => setConfirmEmail(false)} onConfirm={() => void changeEmail()}>
      <p className="dialog-text">Email {detail?.name} akan menjadi <strong>{newEmail}</strong>. Semua sesi karyawan akan dicabut; password tetap sama.</p>
    </ConfirmDialog>
  </div>;
}