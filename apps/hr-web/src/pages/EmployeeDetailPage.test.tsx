import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { AuthError } from '../lib/auth-client';
const id = '11111111-1111-4111-8111-111111111111';
const inactive = { id, code: 'OLD', name: 'Departemen lama', status: 'INACTIVE', createdAt: '', updatedAt: '' };
const position = { ...inactive, id: '22222222-2222-4222-8222-222222222222', name: 'Analis', status: 'ACTIVE' };
const detail = { id, nik: 'EMP-01', name: 'Nama Awal', phone: null, email: 'old@example.test', departmentId: id, positionId: position.id, department: inactive, position, startDate: '2026-10-02', status: 'ACTIVE', updatedAt: '2026-10-02T12:00:00.000Z', emailChange: null };
type Init = { method?: string; body?: unknown; idempotencyKey?: string };
function setup(override?: (path: string, init?: Init) => Promise<unknown>) {
  const api = vi.fn(async (path: string, init?: Init): Promise<unknown> => {
    if (override) return override(path, init);
    if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
    if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
    if (init?.method === 'PATCH') return { ...detail, name: 'Nama Baru', updatedAt: '2026-10-02T12:00:01.000Z' };
    return detail;
  });
  const onBack = vi.fn(), onSessionExpired = vi.fn();
  render(<EmployeeDetailPage client={{ api: api as never }} employeeId={id} onBack={onBack} onSessionExpired={onSessionExpired} />);
  return { api, onBack, onSessionExpired, user: userEvent.setup() };
}
describe('Employee profile and separate account email actions', () => {
  it('preserves an inactive old assignment and saves only profile fields with the loaded version', async () => {
    const { api, user } = setup();
    const form = await screen.findByRole('form', { name: 'Edit profil karyawan' });
    expect(within(form).getByText(/Nilai lama tetap tersimpan/)).toBeVisible();
    await user.clear(within(form).getByLabelText('Nama', { exact: true })); await user.type(within(form).getByLabelText('Nama', { exact: true }), 'Nama Baru');
    await user.click(within(form).getByRole('button', { name: 'Simpan profil' }));
    await screen.findByText('Profil berhasil disimpan.');
    const request = api.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(request?.[1]?.body).toMatchObject({ name: 'Nama Baru', departmentId: id, expectedUpdatedAt: detail.updatedAt });
    expect(request?.[1]?.body).not.toHaveProperty('email'); expect(request?.[1]?.body).not.toHaveProperty('status');
  });
  it('confirms email revocation and resolves a lost response with the same operation instead of editing the profile', async () => {
    const operation = { id, employeeId: id, email: 'new@example.test', status: 'COMPLETED', errorCode: null };
    const { api, user } = setup(async (path, init) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.endsWith('/email') && init?.method === 'POST') throw new AuthError(0, 'Koneksi terputus.');
      if (path.startsWith('employee-email-changes/')) return operation;
      return detail;
    });
    await user.type(await screen.findByLabelText('Email baru'), 'NEW@example.test');
    await user.click(screen.getByRole('button', { name: 'Ubah email' }));
    const dialog = await screen.findByRole('dialog');
    expect(api.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    expect(within(dialog).getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Ubah email' }));
    await screen.findByText('Email berhasil diperbarui. Karyawan perlu masuk kembali dengan email baru.');
    const post = api.mock.calls.find(([path]) => path.endsWith('/email'));
    expect(post?.[1]).toMatchObject({ idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/), body: { expectedEmail: detail.email, email: 'new@example.test' } });
    expect(api).toHaveBeenCalledWith('employee-email-changes/' + post?.[1]?.idempotencyKey);
    expect(api.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });
  it('shows a pending operation after reload and retries it without a second email request', async () => {
    const operation = { id, employeeId: id, email: 'pending@example.test', status: 'PENDING', errorCode: 'AUTH_UNAVAILABLE' };
    const { api, user } = setup(async (path) => {
      if (path.startsWith('departments?')) return { items: [], total: 0, pageSize: 100 };
      if (path.startsWith('positions?')) return { items: [position], total: 1, pageSize: 100 };
      if (path.endsWith('/retry')) return operation;
      return { ...detail, emailChange: operation };
    });
    await user.click(await screen.findByRole('button', { name: 'Lanjutkan perubahan email' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('employee-email-changes/' + id + '/retry', { method: 'POST' }));
    expect(screen.queryByLabelText('Email baru')).not.toBeInTheDocument();
    expect(api.mock.calls.some(([path]) => path.endsWith('/email'))).toBe(false);
  });
  it('reports an expired session without submitting a mutation', async () => {
    const { onSessionExpired, api } = setup(async () => { throw new AuthError(401, 'Sesi berakhir.'); });
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
    expect(api.mock.calls.some(([, init]) => Boolean(init?.method))).toBe(false);
  });
});