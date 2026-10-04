import { useState, type SubmitEvent } from 'react';
import { Button, FieldError, Input, Label, TextField, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { MasterAssignmentSelect } from '../molecules/MasterAssignmentSelect';
import { Notice } from "@attendance/ui";
import type { MasterRecord } from '../../lib/master-data';
import type { EmployeeInput } from '../../lib/employees';
export function EmployeeForm({ departments, positions, busy, error, onSubmit, onCancel, initial, editing = false }: { departments: MasterRecord[]; positions: MasterRecord[]; busy: boolean; error: string; onSubmit: (input: EmployeeInput) => void; onCancel: () => void; initial?: EmployeeInput; editing?: boolean }) {
  const [input, setInput] = useState<EmployeeInput>(initial ?? { nik: '', name: '', phone: '', email: '', departmentId: '', positionId: '', startDate: '', status: 'ACTIVE' });
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeInput, string>>>({});
  const set = (key: keyof EmployeeInput, value: string) => { setInput(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); };
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = { ...input, nik: input.nik.trim().toUpperCase(), name: input.name.trim().replace(/\s+/g, ' '), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || undefined };
    const found: typeof errors = {};
    if (!/^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(value.nik)) found.nik = 'NIK harus 2–40 karakter huruf/angka atau . _ / -.';
    if (value.name.length < 2 || value.name.length > 120) found.name = 'Nama harus 2–120 karakter.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 254) found.email = 'Masukkan email yang valid.';
    if (value.phone && !/^\+?[0-9 ()-]{6,30}$/.test(value.phone)) found.phone = 'Periksa nomor telepon.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.startDate) || !Number.isFinite(Date.parse(value.startDate + 'T00:00:00Z')) || new Date(value.startDate + 'T00:00:00Z').toISOString().slice(0, 10) !== value.startDate || Number(value.startDate.slice(0,4)) < 1900) found.startDate = 'Masukkan tanggal mulai bekerja yang valid.';
    if (!(editing && initial?.departmentId === value.departmentId) && !departments.some(row => row.id === value.departmentId && row.status === 'ACTIVE')) found.departmentId = 'Pilih departemen aktif.';
    if (!(editing && initial?.positionId === value.positionId) && !positions.some(row => row.id === value.positionId && row.status === 'ACTIVE')) found.positionId = 'Pilih jabatan aktif.';
    setErrors(found); if (!Object.keys(found).length) onSubmit(value);
  }
  const conflict = error.startsWith('NIK') ? 'nik' : error.startsWith('Email') ? 'email' : undefined;
  const field = (key: 'nik' | 'name' | 'phone' | 'email' | 'startDate', label: string, type: 'text' | 'email' | 'tel' | 'date' = 'text') => {
    const own = errors[key] || (conflict === key ? error : '');
    return <TextField className="form-field" value={input[key] ?? ''} onChange={value => set(key, value)} isRequired={key !== 'phone'} isDisabled={busy} isInvalid={Boolean(own)} validationBehavior="aria">
      <Label>{label}</Label><Input type={type} autoComplete={key === 'email' ? 'off' : undefined} maxLength={key === 'nik' ? 40 : key === 'name' ? 120 : key === 'phone' ? 30 : undefined} /><FieldError>{own}</FieldError>
    </TextField>;
  };
  return <form className="employee-form" onSubmit={submit} noValidate aria-busy={busy} aria-label={editing ? "Edit profil karyawan" : "Tambah karyawan"}>
    <div className="form-section"><h2>Data karyawan</h2><div className="employee-form-grid">
      {field('nik', 'NIK')}{field('name', 'Nama')}{field('phone', 'Telepon (opsional)', 'tel')}{field('startDate', 'Mulai bekerja', 'date')}
      <div><p className="form-label">Departemen</p><MasterAssignmentSelect label="Departemen" records={departments} current={departments.find(row => row.id === input.departmentId)} onChange={value => set('departmentId', value)} disabled={busy} />{errors.departmentId && <p className="field-validation" role="alert">{errors.departmentId}</p>}</div>
      <div><p className="form-label">Jabatan</p><MasterAssignmentSelect label="Jabatan" records={positions} current={positions.find(row => row.id === input.positionId)} onChange={value => set('positionId', value)} disabled={busy} />{errors.positionId && <p className="field-validation" role="alert">{errors.positionId}</p>}</div>
    </div>{!editing && <div className="employee-status"><p className="form-label">Status awal</p><ToggleButtonGroup aria-label="Status awal" className="status-filter" selectionMode="single" disallowEmptySelection selectedKeys={[input.status]} isDisabled={busy} onSelectionChange={keys => { const [key] = [...keys]; if (key) set('status', String(key)); }}><ToggleButton id="ACTIVE">Aktif</ToggleButton><ToggleButton id="INACTIVE"><ToggleButtonGroup.Separator />Nonaktif</ToggleButton></ToggleButtonGroup></div>}</div>
    {!editing && <div className="form-section"><h2>Akun</h2>{field('email', 'Email', 'email')}<p className="dialog-text">Password sementara ditampilkan setelah akun dan profil selesai dibuat. Karyawan wajib menggantinya saat login pertama.</p></div>}
    {error && !conflict && <Notice message={error} />}
    <div className="form-actions"><Button variant="tertiary" isDisabled={busy} onPress={onCancel}>Batal</Button><Button variant="primary" type="submit" isDisabled={busy || !departments.length || !positions.length}>{busy ? editing ? 'Menyimpan…' : 'Membuat akun…' : editing ? 'Simpan profil' : 'Buat karyawan'}</Button></div>
  </form>;
}
