import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { AuthError } from '../lib/auth-client';

const id = '11111111-1111-4111-8111-111111111111';
const inactive = {
  id,
  code: 'OLD',
  name: 'Departemen lama',
  status: 'INACTIVE' as const,
  createdAt: '',
  updatedAt: '',
};
const position = {
  ...inactive,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Analis',
  status: 'ACTIVE' as const,
};
const detail = {
  id,
  nik: 'EMP-01',
  name: 'Nama Awal',
  phone: null,
  email: 'old@example.test',
  departmentId: id,
  positionId: position.id,
  department: inactive,
  position,
  startDate: '2026-10-02',
  status: 'ACTIVE' as const,
  archivedAt: null,
  updatedAt: '2026-10-02T12:00:00.000Z',
  emailChange: null,
  lifecycleChange: null,
  hasPendingOperation: false,
};

type Init = { method?: string; body?: unknown; idempotencyKey?: string };

function setup(override?: (path: string, init?: Init) => Promise<unknown>) {
  const api = vi.fn(async (path: string, init?: Init): Promise<unknown> => {
    if (override) return override(path, init);
    if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
    if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
    if (path.includes('/history?')) {
      return {
        items: [
          {
            id: 'hist-1',
            action: 'EMPLOYEE_LIFECYCLE_ACTIVE',
            before: { status: 'INACTIVE' },
            after: { status: 'ACTIVE' },
            actorAccountId: 'actor-1',
            createdAt: '2026-10-02T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      };
    }
    if (init?.method === 'PATCH')
      return { ...detail, name: 'Nama Baru', updatedAt: '2026-10-02T12:00:01.000Z' };
    return detail;
  });
  const onBack = vi.fn(),
    onSessionExpired = vi.fn();
  render(
    <MemoryRouter>
      <EmployeeDetailPage
        client={{ api: api as never }}
        employeeId={id}
        onBack={onBack}
        onSessionExpired={onSessionExpired}
      />
    </MemoryRouter>,
  );
  return { api, onBack, onSessionExpired, user: userEvent.setup() };
}

describe('Employee profile and separate account email actions', () => {
  it('preserves an inactive old assignment and saves only profile fields with the loaded version', async () => {
    const { api, user } = setup();
    const form = await screen.findByRole('form', { name: 'Edit profil karyawan' });
    expect(within(form).getByText(/Nilai lama tetap tersimpan/)).toBeVisible();
    await user.clear(within(form).getByLabelText('Nama', { exact: true }));
    await user.type(within(form).getByLabelText('Nama', { exact: true }), 'Nama Baru');
    await user.click(within(form).getByRole('button', { name: 'Simpan profil' }));
    await screen.findByText('Profil berhasil disimpan.');
    const request = api.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(request?.[1]?.body).toMatchObject({
      name: 'Nama Baru',
      departmentId: id,
      expectedUpdatedAt: detail.updatedAt,
    });
    expect(request?.[1]?.body).not.toHaveProperty('email');
    expect(request?.[1]?.body).not.toHaveProperty('status');
  });

  it('confirms email revocation and resolves a lost response with the same operation instead of editing the profile', async () => {
    const operation = {
      id,
      employeeId: id,
      email: 'new@example.test',
      status: 'COMPLETED',
      errorCode: null,
    };
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/email') && init?.method === 'POST')
        throw new AuthError(0, 'Koneksi terputus.');
      if (path.startsWith('employee-email-changes/')) return operation;
      return detail;
    });
    await user.type(await screen.findByLabelText('Email baru'), 'NEW@example.test');
    await user.click(screen.getByRole('button', { name: 'Ubah email' }));
    const dialog = await screen.findByRole('dialog');
    expect(api.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    expect(within(dialog).getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Ubah email' }));
    await screen.findByText(
      'Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.',
    );
    const post = api.mock.calls.find(([path]) => path.endsWith('/email'));
    expect(post?.[1]).toMatchObject({
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      body: { expectedEmail: detail.email, email: 'new@example.test' },
    });
    expect(api).toHaveBeenCalledWith('employee-email-changes/' + post?.[1]?.idempotencyKey);
    expect(api.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('shows a pending operation after reload and retries it without a second email request', async () => {
    const operation = {
      id,
      employeeId: id,
      email: 'pending@example.test',
      status: 'PENDING',
      errorCode: 'AUTH_UNAVAILABLE',
    };
    const { api, user } = setup(async (path) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/retry')) return operation;
      return { ...detail, emailChange: operation, hasPendingOperation: true };
    });
    await user.click(await screen.findByRole('button', { name: 'Lanjutkan perubahan email' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('employee-email-changes/' + id + '/retry', {
        method: 'POST',
      }),
    );
    expect(screen.queryByLabelText('Email baru')).not.toBeInTheDocument();
    expect(api.mock.calls.some(([path]) => path.endsWith('/email'))).toBe(false);
  });

  it('reports an expired session without submitting a mutation', async () => {
    const { onSessionExpired, api } = setup(async () => {
      throw new AuthError(401, 'Sesi berakhir.');
    });
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
    expect(api.mock.calls.some(([, init]) => Boolean(init?.method))).toBe(false);
  });
});

describe('H08 Employee lifecycle actions and history', () => {
  it('allows deactivation with session revocation warning in confirmation dialog', async () => {
    const lifecycleOp = {
      id: 'op-deact',
      employeeId: id,
      targetStatus: 'INACTIVE',
      status: 'COMPLETED',
      errorCode: null,
    };
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/lifecycle') && init?.method === 'POST') return lifecycleOp;
      return detail;
    });

    const deactBtn = await screen.findByRole('button', { name: 'Nonaktifkan' });
    expect(deactBtn).toBeVisible();
    await user.click(deactBtn);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Nonaktifkan karyawan\?/)).toBeVisible();
    expect(within(dialog).getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }));

    await screen.findByText('Status karyawan berhasil dinonaktifkan.');
    const postCall = api.mock.calls.find(([path]) => path.endsWith('/lifecycle'));
    expect(postCall?.[1]).toMatchObject({
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      body: { expectedStatus: 'ACTIVE', targetStatus: 'INACTIVE' },
    });
  });

  it('allows activation from INACTIVE and archiving with session revocation warning', async () => {
    const inactiveDetail = { ...detail, status: 'INACTIVE' as const };
    const lifecycleOp = {
      id: 'op-arch',
      employeeId: id,
      targetStatus: 'ARCHIVED',
      status: 'COMPLETED',
      errorCode: null,
    };
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/lifecycle') && init?.method === 'POST') return lifecycleOp;
      return inactiveDetail;
    });

    expect(await screen.findByRole('button', { name: 'Aktifkan' })).toBeVisible();
    const archBtn = screen.getByRole('button', { name: 'Arsipkan' });
    await user.click(archBtn);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Arsipkan karyawan\?/)).toBeVisible();
    expect(within(dialog).getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();
    expect(within(dialog).getByText(/NIK dan email tetap dicadangkan/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Arsipkan' }));
    await screen.findByText('Status karyawan berhasil diarsipkan.');
    const postCall = api.mock.calls.find(([path]) => path.endsWith('/lifecycle'));
    expect(postCall?.[1]).toMatchObject({
      body: { expectedStatus: 'INACTIVE', targetStatus: 'ARCHIVED' },
    });
  });

  it('allows restore from ARCHIVED with notice that activation is separate, and hides profile/email edit form', async () => {
    const archivedDetail = {
      ...detail,
      status: 'ARCHIVED' as const,
      archivedAt: '2026-10-02T12:00:00.000Z',
    };
    const restoreOp = {
      id: 'op-rest',
      employeeId: id,
      targetStatus: 'INACTIVE',
      status: 'COMPLETED',
      errorCode: null,
    };
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/lifecycle') && init?.method === 'POST') return restoreOp;
      return archivedDetail;
    });

    expect(await screen.findByText('Karyawan arsip tidak dapat diedit.')).toBeVisible();
    expect(screen.queryByRole('form', { name: 'Edit profil karyawan' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email baru')).not.toBeInTheDocument();

    const restoreBtn = screen.getByRole('button', { name: 'Restore karyawan' });
    await user.click(restoreBtn);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Restore karyawan\?/)).toBeVisible();
    expect(within(dialog).getByText(/dipulihkan dengan status Nonaktif/)).toBeVisible();
    expect(within(dialog).getByText(/Aktivasi dilakukan secara terpisah/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));
    await screen.findByText('Status karyawan berhasil dinonaktifkan.');
    const postCall = api.mock.calls.find(([path]) => path.endsWith('/lifecycle'));
    expect(postCall?.[1]).toMatchObject({
      body: { expectedStatus: 'ARCHIVED', targetStatus: 'INACTIVE' },
    });
  });

  it('locks mutations when hasPendingOperation is true and allows retrying pending lifecycle', async () => {
    const pendingOp = {
      id: 'op-pending-life',
      employeeId: id,
      targetStatus: 'INACTIVE' as const,
      status: 'PENDING' as const,
      errorCode: 'AUTH_UNAVAILABLE',
    };
    const { api, user } = setup(async (path) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) return { items: [], total: 0, page: 1, pageSize: 10 };
      if (path.endsWith('/retry')) return { ...pendingOp, status: 'COMPLETED' };
      return {
        ...detail,
        hasPendingOperation: true,
        lifecycleChange: pendingOp,
      };
    });

    // Check action buttons disabled
    const deactBtn = await screen.findByRole('button', { name: 'Nonaktifkan' });
    expect(deactBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Arsipkan' })).toBeDisabled();

    // Check banner for pending lifecycle
    expect(
      screen.getByText(/Sedang menyelesaikan perubahan status ke INACTIVE\./),
    ).toBeVisible();

    // Retry button works
    const retryBtn = screen.getByRole('button', { name: 'Lanjutkan perubahan status' });
    await user.click(retryBtn);

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('employee-lifecycle/op-pending-life/retry', {
        method: 'POST',
      }),
    );
  });

  it('displays history timeline loaded from GET /employees/:id/history', async () => {
    const { user } = setup();

    await user.click(await screen.findByRole('tab', { name: /Riwayat/ }));
    const historySection = await screen.findByRole('tabpanel', {
      name: 'Riwayat perubahan karyawan',
    });
    expect(historySection).toBeVisible();
    expect(within(historySection).getByText('Status diaktifkan')).toBeVisible();
    expect(
      within(historySection).getByText(/Status diubah menjadi/),
    ).toBeVisible();
  });

  it('shows reset password confirmation dialog with session revocation warning, executes API call, and displays one-time TemporaryPasswordDialog', async () => {
    const tempPassword = 'New-Temp-Password-123';
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.includes('/history?')) {
        return {
          items: [
            {
              id: 'hist-reset-1',
              action: 'EMPLOYEE_PASSWORD_RESET',
              before: {},
              after: { mustChangePassword: true },
              actorAccountId: 'actor-1',
              createdAt: '2026-10-02T11:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        };
      }
      if (path.endsWith('/reset-password') && init?.method === 'POST') {
        return { email: detail.email, temporaryPassword: tempPassword };
      }
      return detail;
    });

    const resetBtn = await screen.findByRole('button', { name: 'Reset password' });
    expect(resetBtn).toBeVisible();
    expect(resetBtn).not.toBeDisabled();
    await user.click(resetBtn);

    // Confirmation dialog with explicit revocation warning
    expect(screen.getByText('Reset password karyawan?')).toBeVisible();
    expect(screen.getByText(/Semua sesi karyawan akan dicabut seketika/)).toBeVisible();
    expect(screen.getByText(/Password sementara baru akan dibuat dan hanya ditampilkan sekali/)).toBeVisible();

    // Confirm action
    const confirmBtn = screen.getByRole('button', { name: 'Reset password' });
    await user.click(confirmBtn);

    await waitFor(() => {
      const resetCall = api.mock.calls.find(([path, init]) => path.endsWith('/reset-password') && init?.method === 'POST');
      expect(resetCall).toBeDefined();
      expect(resetCall?.[1]?.idempotencyKey).toBeDefined();
    });

    // One-time TemporaryPasswordDialog is rendered
    expect(screen.getByRole('heading', { name: 'Password sementara' })).toBeVisible();
    expect(screen.getByDisplayValue(tempPassword)).toBeVisible();

    // Close one-time dialog
    const finishBtn = screen.getByRole('button', { name: 'Selesai' });
    await user.click(finishBtn);

    expect(screen.queryByDisplayValue(tempPassword)).not.toBeInTheDocument();
    expect(screen.getByText(/Password berhasil di-reset/)).toBeVisible();

    // History section renders password reset event
    await user.click(screen.getByRole('tab', { name: /Riwayat/ }));
    const historySection = await screen.findByRole('tabpanel', { name: 'Riwayat perubahan karyawan' });
    expect(within(historySection).getByText('Password di-reset')).toBeVisible();
    expect(within(historySection).getByText('Sesi dicabut dan password sementara baru dibuat.')).toBeVisible();
  });
});