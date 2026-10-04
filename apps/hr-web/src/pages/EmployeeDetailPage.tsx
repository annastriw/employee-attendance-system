import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from '@phosphor-icons/react';
import { PageHeader, UnderlineTabs } from '@attendance/ui';
import { AuthError, type AuthClient } from '../lib/auth-client';
import {
  loadActiveMasters,
  type EmployeeDetail,
  type EmployeeInput,
  type EmailChangeOperation,
  type LifecycleOperation,
  type EmployeeHistoryRecord,
  type EmployeeHistoryPage,
  type TemporaryCredential,
} from '../lib/employees';
import type { MasterRecord } from '../lib/master-data';
import { EmployeeForm } from '../components/organisms/EmployeeForm';
import { ConfirmDialog, Notice, StatusBadge } from "@attendance/ui";
import { TemporaryPasswordDialog } from '../components/organisms/TemporaryPasswordDialog';

const failure = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'Terjadi kesalahan. Coba lagi.';

type DetailTab = 'detail' | 'riwayat' | 'sesi';

function formatAction(action: string): string {
  switch (action) {
    case 'EMPLOYEE_PROFILE_UPDATED':
      return 'Profil diperbarui';
    case 'EMPLOYEE_EMAIL_CHANGED':
      return 'Email diubah';
    case 'EMPLOYEE_LIFECYCLE_ACTIVE':
      return 'Status diaktifkan';
    case 'EMPLOYEE_LIFECYCLE_INACTIVE':
      return 'Status dinonaktifkan';
    case 'EMPLOYEE_LIFECYCLE_ARCHIVED':
      return 'Status diarsipkan';
    case 'EMPLOYEE_PASSWORD_RESET':
      return 'Password di-reset';
    default:
      return action;
  }
}

function formatHistoryDetails(item: EmployeeHistoryRecord) {
  if (item.action.startsWith('EMPLOYEE_LIFECYCLE_')) {
    const target = item.after?.status as string;
    const label =
      target === 'ACTIVE' ? 'Aktif' : target === 'INACTIVE' ? 'Nonaktif' : 'Arsip';
    return (
      <p className="dialog-text">
        Status diubah menjadi <strong>{label}</strong>
      </p>
    );
  }
  if (item.action === 'EMPLOYEE_EMAIL_CHANGED') {
    return (
      <p className="dialog-text">
        Email diubah menjadi <strong>{String(item.after?.email ?? '')}</strong>
      </p>
    );
  }
  if (item.action === 'EMPLOYEE_PASSWORD_RESET') {
    return (
      <p className="dialog-text">
        Sesi dicabut dan password sementara baru dibuat.
      </p>
    );
  }
  if (item.action === 'EMPLOYEE_PROFILE_UPDATED' && item.after) {
    const changes: string[] = [];
    if (item.before?.name !== item.after?.name) changes.push(`Nama: ${item.after?.name}`);
    if (item.before?.phone !== item.after?.phone)
      changes.push(`Telepon: ${item.after?.phone ?? '-'}`);
    if (item.before?.departmentId !== item.after?.departmentId)
      changes.push('Departemen diubah');
    if (item.before?.positionId !== item.after?.positionId)
      changes.push('Jabatan diubah');
    if (item.before?.startDate !== item.after?.startDate)
      changes.push(`Mulai: ${item.after?.startDate}`);
    return <p className="dialog-text">{changes.join(', ') || 'Data profil disimpan'}</p>;
  }
  return null;
}

export function EmployeeDetailPage({
  client,
  employeeId,
  onBack,
  onSessionExpired,
}: {
  client: Pick<AuthClient, 'api'>;
  employeeId: string;
  onBack: () => void;
  onSessionExpired: () => void;
}) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const navigate = useNavigate();
  const [masters, setMasters] = useState<{
    departments: MasterRecord[];
    positions: MasterRecord[];
  } | null>(null);
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<DetailTab>('detail');
  const [loadError, setLoadError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [lifecycleError, setLifecycleError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [confirmLifecycle, setConfirmLifecycle] = useState<
    'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | null
  >(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCredential, setResetCredential] = useState<TemporaryCredential | null>(null);

  const [history, setHistory] = useState<EmployeeHistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  const emailSubmission = useRef<{ key: string; payload: string } | null>(null);
  const lifecycleSubmission = useRef<{ key: string; payload: string } | null>(null);

  const handle = useCallback(
    (reason: unknown) => {
      if (reason instanceof AuthError && reason.status === 401) onSessionExpired();
      return failure(reason);
    },
    [onSessionExpired],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      client.api<EmployeeDetail>('employees/' + employeeId),
      loadActiveMasters(client, 'departments'),
      loadActiveMasters(client, 'positions'),
    ])
      .then(([value, departments, positions]) => {
        if (!active) return;
        setDetail(value);
        setLoadError('');
        setMasters({
          departments: departments.some((row) => row.id === value.departmentId)
            ? departments
            : [...departments, value.department],
          positions: positions.some((row) => row.id === value.positionId)
            ? positions
            : [...positions, value.position],
        });
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(handle(reason));
      });
    return () => {
      active = false;
    };
  }, [client, employeeId, handle, reload]);

  useEffect(() => {
    let active = true;
    client
      .api<EmployeeHistoryPage>(
        `employees/${employeeId}/history?page=${historyPage}&pageSize=${historyPageSize}`,
      )
      .then((res) => {
        if (!active) return;
        setHistory(res.items);
        setHistoryTotal(res.total);
      })
      .catch(() => {
        /* History loading error does not block the main profile */
      });
    return () => {
      active = false;
    };
  }, [client, employeeId, historyPage, reload]);

  const pendingEmailId =
    detail?.emailChange?.status === 'PENDING' ? detail.emailChange.id : '';
  useEffect(() => {
    if (!pendingEmailId) return;
    let active = true;
    const timer = setInterval(() => {
      client
        .api<EmailChangeOperation>('employee-email-changes/' + pendingEmailId)
        .then((value) => {
          if (!active || value.status === 'PENDING') return;
          setDetail((current) => (current ? { ...current, emailChange: value } : current));
          emailSubmission.current = null;
          if (value.status === 'FAILED')
            setEmailError(
              'Perubahan email ditolak. Email sudah digunakan atau akun berubah; muat ulang dan periksa email baru.',
            );
          else {
            setNotice(
              'Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.',
            );
            setNewEmail('');
          }
          setReload((current) => current + 1);
        })
        .catch((reason: unknown) => {
          if (active) setEmailError(handle(reason));
        });
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, handle, pendingEmailId]);

  const pendingLifecycleId =
    detail?.lifecycleChange?.status === 'PENDING' ? detail.lifecycleChange.id : '';
  useEffect(() => {
    if (!pendingLifecycleId) return;
    let active = true;
    const timer = setInterval(() => {
      client
        .api<LifecycleOperation>('employee-lifecycle/' + pendingLifecycleId)
        .then((value) => {
          if (!active || value.status === 'PENDING') return;
          acceptLifecycleOperation(value);
        })
        .catch((reason: unknown) => {
          if (active) setLifecycleError(handle(reason));
        });
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, handle, pendingLifecycleId]);

  async function saveProfile(input: EmployeeInput) {
    if (!detail) return;
    setBusy(true);
    setProfileError('');
    setNotice('');
    const profile = {
      nik: input.nik,
      name: input.name,
      phone: input.phone,
      departmentId: input.departmentId,
      positionId: input.positionId,
      startDate: input.startDate,
    };
    try {
      const value = await client.api<EmployeeDetail>('employees/' + employeeId, {
        method: 'PATCH',
        body: { ...profile, expectedUpdatedAt: detail.updatedAt },
      });
      setDetail(value);
      setNotice('Profil berhasil disimpan.');
      setReload((current) => current + 1);
    } catch (reason) {
      setProfileError(handle(reason));
    } finally {
      setBusy(false);
    }
  }

  function prepareEmail(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setEmailError('Masukkan email baru yang valid.');
      return;
    }
    if (email === detail?.email) {
      setEmailError('Gunakan email baru yang berbeda.');
      return;
    }
    setNewEmail(email);
    setEmailError('');
    setConfirmEmail(true);
  }

  function acceptEmailOperation(value: EmailChangeOperation) {
    setDetail((current) => (current ? { ...current, emailChange: value } : current));
    setConfirmEmail(false);
    if (value.status !== 'PENDING') emailSubmission.current = null;
    if (value.status === 'FAILED')
      setEmailError(
        'Perubahan email ditolak. Email sudah digunakan atau akun berubah; muat ulang dan periksa email baru.',
      );
    if (value.status === 'COMPLETED') {
      setDetail((current) => (current ? { ...current, email: value.email } : current));
      setNotice(
        'Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.',
      );
      setNewEmail('');
    }
    setReload((current) => current + 1);
  }

  async function changeEmail() {
    if (!detail) return;
    const body = { email: newEmail, expectedEmail: detail.email };
    const payload = JSON.stringify(body);
    if (!emailSubmission.current || emailSubmission.current.payload !== payload)
      emailSubmission.current = { key: crypto.randomUUID(), payload };
    const key = emailSubmission.current.key;
    setBusy(true);
    setEmailError('');
    setNotice('');
    try {
      acceptEmailOperation(
        await client.api<EmailChangeOperation>('employees/' + employeeId + '/email', {
          method: 'POST',
          body,
          idempotencyKey: key,
        }),
      );
    } catch (reason) {
      setEmailError(handle(reason));
      try {
        acceptEmailOperation(
          await client.api<EmailChangeOperation>('employee-email-changes/' + key),
        );
      } catch {
        /* An unaccepted request keeps the same key for an explicit retry. */
      }
    } finally {
      setBusy(false);
    }
  }

  async function retryEmail() {
    if (!pendingEmailId) return;
    setBusy(true);
    setEmailError('');
    try {
      acceptEmailOperation(
        await client.api<EmailChangeOperation>(
          'employee-email-changes/' + pendingEmailId + '/retry',
          { method: 'POST' },
        ),
      );
    } catch (reason) {
      setEmailError(handle(reason));
    } finally {
      setBusy(false);
    }
  }

  function acceptLifecycleOperation(value: LifecycleOperation) {
    setDetail((current) => (current ? { ...current, lifecycleChange: value } : current));
    setConfirmLifecycle(null);
    if (value.status !== 'PENDING') lifecycleSubmission.current = null;
    if (value.status === 'FAILED') {
      setLifecycleError(
        'Perubahan status ditolak. Status akun berubah atau tidak valid; muat ulang dan periksa data terbaru.',
      );
    } else if (value.status === 'COMPLETED') {
      const label =
        value.targetStatus === 'ACTIVE'
          ? 'diaktifkan'
          : value.targetStatus === 'INACTIVE'
            ? 'dinonaktifkan'
            : 'diarsipkan';
      setNotice(`Status karyawan berhasil ${label}.`);
      setReload((current) => current + 1);
    }
  }

  async function applyLifecycle(targetStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') {
    if (!detail) return;
    const body = { expectedStatus: detail.status, targetStatus };
    const payload = JSON.stringify(body);
    if (
      !lifecycleSubmission.current ||
      lifecycleSubmission.current.payload !== payload
    ) {
      lifecycleSubmission.current = { key: crypto.randomUUID(), payload };
    }
    const key = lifecycleSubmission.current.key;
    setBusy(true);
    setLifecycleError('');
    setNotice('');
    try {
      const res = await client.api<LifecycleOperation>(
        'employees/' + employeeId + '/lifecycle',
        {
          method: 'POST',
          body,
          idempotencyKey: key,
        },
      );
      acceptLifecycleOperation(res);
    } catch (reason) {
      setLifecycleError(handle(reason));
      try {
        const existing = await client.api<LifecycleOperation>(
          'employee-lifecycle/' + key,
        );
        acceptLifecycleOperation(existing);
      } catch {
        /* Keep key for retry */
      }
    } finally {
      setBusy(false);
    }
  }

  async function retryLifecycle() {
    if (!pendingLifecycleId) return;
    setBusy(true);
    setLifecycleError('');
    try {
      const res = await client.api<LifecycleOperation>(
        'employee-lifecycle/' + pendingLifecycleId + '/retry',
        { method: 'POST' },
      );
      acceptLifecycleOperation(res);
    } catch (reason) {
      setLifecycleError(handle(reason));
    } finally {
      setBusy(false);
    }
  }

  async function executeResetPassword() {
    if (!detail) return;
    const key = crypto.randomUUID();
    setBusy(true);
    setNotice('');
    setLifecycleError('');
    try {
      const res = await client.api<TemporaryCredential>(
        'employees/' + employeeId + '/reset-password',
        {
          method: 'POST',
          idempotencyKey: key,
        },
      );
      setConfirmReset(false);
      setResetCredential(res);
      setNotice(
        'Password berhasil di-reset. Sampaikan password sementara baru kepada karyawan.',
      );
      setReload((current) => current + 1);
    } catch (reason) {
      setConfirmReset(false);
      setLifecycleError(handle(reason));
    } finally {
      setBusy(false);
    }
  }

  // Lifecycle action buttons shown in the page header, driven by current status.
  const actionsDisabled = busy || Boolean(detail?.hasPendingOperation);
  const lifecycleActions = detail && (
    <>
      {detail.status === 'ACTIVE' && (
        <>
          <Button variant="secondary" isDisabled={actionsDisabled} onPress={() => setConfirmReset(true)}>
            Reset password
          </Button>
          <Button variant="secondary" isDisabled={actionsDisabled} onPress={() => setConfirmLifecycle('INACTIVE')}>
            Nonaktifkan
          </Button>
          <Button variant="danger" isDisabled={actionsDisabled} onPress={() => setConfirmLifecycle('ARCHIVED')}>
            Arsipkan
          </Button>
        </>
      )}
      {detail.status === 'INACTIVE' && (
        <>
          <Button variant="secondary" isDisabled={actionsDisabled} onPress={() => setConfirmReset(true)}>
            Reset password
          </Button>
          <Button variant="primary" isDisabled={actionsDisabled} onPress={() => setConfirmLifecycle('ACTIVE')}>
            Aktifkan
          </Button>
          <Button variant="danger" isDisabled={actionsDisabled} onPress={() => setConfirmLifecycle('ARCHIVED')}>
            Arsipkan
          </Button>
        </>
      )}
      {detail.status === 'ARCHIVED' && (
        <Button variant="secondary" isDisabled={actionsDisabled} onPress={() => setConfirmLifecycle('INACTIVE')}>
          Restore karyawan
        </Button>
      )}
    </>
  );

  const historyCount = historyTotal || history.length;

  return (
    <div className="employee-detail">
      <PageHeader
        breadcrumb={[{ label: 'Karyawan', href: '/karyawan' }, { label: detail?.name ?? 'Memuat…' }]}
        onNavigate={() => onBack()}
        title={
          <span className="employee-detail-title">
            <span>{detail?.name ?? 'Profil karyawan'}</span>
            {detail && <StatusBadge status={detail.status} />}
          </span>
        }
        description={detail ? `NIK ${detail.nik}` : undefined}
        actions={
          <div className="employee-detail-actions">
            <Button variant="tertiary" isDisabled={busy} onPress={onBack}>
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali
            </Button>
            <Button
              variant="tertiary"
              isDisabled={busy}
              onPress={() => navigate(`/absensi?employeeId=${employeeId}`)}
            >
              <Clock size={16} aria-hidden="true" />
              Lihat absensi
            </Button>
            {lifecycleActions}
          </div>
        }
      />

      {loadError ? (
        <div className="load-error">
          <Notice message={loadError} />
          <Button variant="secondary" onPress={() => setReload((value) => value + 1)}>
            Muat ulang
          </Button>
        </div>
      ) : !detail || !masters ? (
        <p role="status">Memuat profil karyawan…</p>
      ) : (
        <>
          {notice && <Notice message={notice} success />}
          {lifecycleError && !confirmLifecycle && !confirmReset && <Notice message={lifecycleError} />}

          {pendingLifecycleId && (
            <div className="provisioning-result" role="status">
              <p>
                Sedang menyelesaikan perubahan status ke{' '}
                {detail.lifecycleChange?.targetStatus}.
              </p>
              <Button variant="secondary" isDisabled={busy} onPress={() => void retryLifecycle()}>
                Lanjutkan perubahan status
              </Button>
            </div>
          )}

          {detail.hasPendingOperation && !pendingLifecycleId && !pendingEmailId && (
            <Notice message="Operasi sebelumnya sedang diproses. Selesaikan atau pulihkan terlebih dahulu." />
          )}

          <UnderlineTabs
            items={[
              { id: 'detail', label: 'Detail' },
              { id: 'riwayat', label: 'Riwayat', count: historyCount },
              { id: 'sesi', label: 'Sesi' },
            ]}
            active={tab}
            onSelect={(id) => setTab(id as DetailTab)}
          />

          {tab === 'detail' && (
            <div className="detail-panel" role="tabpanel" aria-label="Detail karyawan">
              {detail.status === 'ARCHIVED' ? (
                <p className="dialog-text">Karyawan arsip tidak dapat diedit.</p>
              ) : (
                <>
                  <EmployeeForm
                    key={JSON.stringify([
                      detail.nik,
                      detail.name,
                      detail.phone,
                      detail.departmentId,
                      detail.positionId,
                      detail.startDate,
                    ])}
                    editing
                    initial={{ ...detail, phone: detail.phone ?? '', status: detail.status }}
                    departments={masters.departments}
                    positions={masters.positions}
                    busy={busy || Boolean(detail.hasPendingOperation)}
                    error={profileError}
                    onSubmit={(input) => void saveProfile(input)}
                    onCancel={onBack}
                  />
                  {profileError && (
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setProfileError('');
                        setReload((value) => value + 1);
                      }}
                    >
                      Muat ulang profil
                    </Button>
                  )}
                  <form
                    className="form-section"
                    onSubmit={prepareEmail}
                    noValidate
                    aria-label="Ubah email karyawan"
                  >
                    <h2>Akun</h2>
                    <p className="dialog-text">
                      Email saat ini: <strong>{detail.email}</strong>
                    </p>
                    {emailError && !confirmEmail && <Notice message={emailError} />}
                    {pendingEmailId ? (
                      <div className="provisioning-result">
                        <p role="status">
                          Sedang menyelesaikan perubahan ke {detail.emailChange?.email}.
                        </p>
                        <Button variant="secondary" isDisabled={busy} onPress={() => void retryEmail()}>
                          Lanjutkan perubahan email
                        </Button>
                      </div>
                    ) : (
                      <>
                        <TextField
                          className="form-field"
                          value={newEmail}
                          onChange={(value) => {
                            setNewEmail(value);
                            setEmailError('');
                          }}
                          isRequired
                          isDisabled={busy || Boolean(detail.hasPendingOperation)}
                          validationBehavior="aria"
                        >
                          <Label>Email baru</Label>
                          <Input type="email" autoComplete="off" maxLength={254} />
                        </TextField>
                        <p className="dialog-text">
                          Sesi karyawan dicabut setelah email diubah. Karyawan masuk kembali
                          dengan email baru dan password yang sama.
                        </p>
                        <div className="form-actions">
                          <Button
                            variant="primary"
                            type="submit"
                            isDisabled={busy || Boolean(detail.hasPendingOperation)}
                          >
                            Ubah email
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                </>
              )}
            </div>
          )}

          {tab === 'riwayat' && (
            <section
              className="form-section employee-history"
              role="tabpanel"
              aria-label="Riwayat perubahan karyawan"
            >
              <h2>Riwayat perubahan</h2>
              {history.length === 0 ? (
                <p className="dialog-text">Belum ada riwayat perubahan.</p>
              ) : (
                <ul className="history-list" aria-label="Daftar riwayat">
                  {history.map((item) => (
                    <li key={item.id} className="history-item">
                      <div className="history-item-header">
                        <span className="cell-strong">{formatAction(item.action)}</span>
                        <span className="history-date">
                          {new Date(item.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Asia/Jakarta',
                          })}
                        </span>
                      </div>
                      {formatHistoryDetails(item)}
                    </li>
                  ))}
                </ul>
              )}
              {historyTotal > historyPageSize && (
                <div className="history-pagination">
                  <Button
                    variant="secondary"
                    isDisabled={historyPage <= 1 || busy}
                    onPress={() => setHistoryPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span>
                    Halaman {historyPage} dari {Math.ceil(historyTotal / historyPageSize)}
                  </span>
                  <Button
                    variant="secondary"
                    isDisabled={historyPage * historyPageSize >= historyTotal || busy}
                    onPress={() => setHistoryPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </section>
          )}

          {tab === 'sesi' && (
            <section
              className="form-section employee-sessions"
              role="tabpanel"
              aria-label="Sesi dan akun karyawan"
            >
              <h2>Sesi dan akun</h2>
              <p className="dialog-text">
                Email masuk saat ini: <strong>{detail.email}</strong>
              </p>
              <p className="dialog-text">
                Reset password dan perubahan email mencabut seluruh sesi aktif karyawan
                seketika. Setelah dicabut, karyawan harus masuk kembali.
              </p>
              {detail.status === 'ARCHIVED' ? (
                <p className="dialog-text">
                  Karyawan arsip tidak dapat masuk; tidak ada sesi aktif.
                </p>
              ) : (
                <p className="dialog-text">
                  Gunakan <strong>Reset password</strong> di bagian atas halaman untuk
                  mencabut sesi dan membuat password sementara baru.
                </p>
              )}
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmEmail}
        title="Ubah email karyawan?"
        confirmLabel="Ubah email"
        busy={busy}
        error={emailError}
        onClose={() => setConfirmEmail(false)}
        onConfirm={() => void changeEmail()}
      >
        <p className="dialog-text">
          Email {detail?.name} akan menjadi <strong>{newEmail}</strong>. Semua sesi
          karyawan akan dicabut; password tetap sama.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmLifecycle !== null}
        title={
          confirmLifecycle === 'INACTIVE'
            ? detail?.status === 'ARCHIVED'
              ? 'Restore karyawan?'
              : 'Nonaktifkan karyawan?'
            : confirmLifecycle === 'ARCHIVED'
              ? 'Arsipkan karyawan?'
              : 'Aktifkan karyawan?'
        }
        confirmLabel={
          confirmLifecycle === 'INACTIVE'
            ? detail?.status === 'ARCHIVED'
              ? 'Restore'
              : 'Nonaktifkan'
            : confirmLifecycle === 'ARCHIVED'
              ? 'Arsipkan'
              : 'Aktifkan'
        }
        busy={busy}
        error={lifecycleError}
        onClose={() => setConfirmLifecycle(null)}
        onConfirm={() => {
          if (confirmLifecycle) void applyLifecycle(confirmLifecycle);
        }}
      >
        {confirmLifecycle === 'INACTIVE' &&
          (detail?.status === 'ARCHIVED' ? (
            <p className="dialog-text">
              Restore <strong>{detail?.name}</strong> (NIK: {detail?.nik})? Karyawan akan
              dipulihkan dengan status Nonaktif. Aktivasi dilakukan secara terpisah
              setelah restore berhasil.
            </p>
          ) : (
            <p className="dialog-text">
              Nonaktifkan <strong>{detail?.name}</strong> (NIK: {detail?.nik})? Semua sesi
              karyawan akan dicabut. Karyawan tidak dapat masuk sampai diaktifkan
              kembali.
            </p>
          ))}
        {confirmLifecycle === 'ARCHIVED' && (
          <p className="dialog-text">
            Arsipkan <strong>{detail?.name}</strong> (NIK: {detail?.nik})? Semua sesi
            karyawan akan dicabut. Karyawan arsip tidak dapat masuk atau diedit. NIK dan
            email tetap dicadangkan.
          </p>
        )}
        {confirmLifecycle === 'ACTIVE' && (
          <p className="dialog-text">
            Aktifkan <strong>{detail?.name}</strong> (NIK: {detail?.nik})? Karyawan dapat
            masuk kembali dengan akun yang ada.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title="Reset password karyawan?"
        confirmLabel="Reset password"
        busy={busy}
        error={lifecycleError}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void executeResetPassword()}
      >
        <p className="dialog-text">
          Reset password untuk <strong>{detail?.name}</strong> ({detail?.email})? Semua sesi
          karyawan akan dicabut seketika. Password sementara baru akan dibuat dan hanya ditampilkan sekali.
        </p>
      </ConfirmDialog>

      {resetCredential && (
        <TemporaryPasswordDialog
          credential={resetCredential}
          onClose={() => setResetCredential(null)}
        />
      )}
    </div>
  );
}
