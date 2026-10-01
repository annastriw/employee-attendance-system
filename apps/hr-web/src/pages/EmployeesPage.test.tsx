import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeesPage } from './EmployeesPage';
import { AuthError } from '../lib/auth-client';
import { loadActiveMasters } from '../lib/employees';
const id = '11111111-1111-4111-8111-111111111111';
const master = { id, name: 'Operasional', code: 'OPS', status: 'ACTIVE', createdAt: '', updatedAt: '' };
const employee = { id, nik: 'EMP-01', name: 'Test Employee', email: 'employee@example.test', department: 'Operasional', position: 'Analis', startDate: '2026-10-02', status: 'ACTIVE' };
const completed = { id, employeeId: id, email: employee.email, status: 'COMPLETED', errorCode: null };
function setup(params = '', override?: (path: string, init?: { body?: unknown; method?: string }) => Promise<unknown>) {
  const api = vi.fn(async (path: string, init?: { body?: unknown; method?: string; idempotencyKey?: string }) => {
    if (override) return override(path, init);
    if (path.startsWith('departments?') || path.startsWith('positions?')) return { items: [master], total: 1, page: 1, pageSize: 100 };
    if (path.startsWith('employees?')) return { items: [employee], total: 1, page: 1, pageSize: 20 };
    if (path.endsWith('/credentials')) return { email: employee.email, temporaryPassword: 'one-time-ui-test-password' };
    return completed;
  });
  const onParamsChange = vi.fn(), onSessionExpired = vi.fn();
  render(<EmployeesPage client={{ api: api as never }} params={new URLSearchParams(params)} onParamsChange={onParamsChange} onSessionExpired={onSessionExpired} />);
  return { api, onParamsChange, onSessionExpired, user: userEvent.setup() };
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Tambah' }));
  await user.type(await screen.findByLabelText('NIK'), 'emp-02'); await user.type(screen.getByLabelText('Nama', { exact: true }), '  New Employee  '); await user.type(screen.getByLabelText('Email', { exact: true }), 'New@example.test');
  await user.type(screen.getByLabelText('Mulai bekerja'), '2026-10-02');
  for (const label of ['departemen', 'jabatan']) { await user.click(screen.getByRole('button', { name: 'Pilih ' + label })); await user.click(await screen.findByRole('menuitemradio', { name: 'Operasional' })); }
}
describe('Employee creation and one-time password UI', () => {
  it('lists real records and keeps status filters in URL', async () => {
    const { user, onParamsChange } = setup('search=Test&page=2'); await screen.findByText('Test Employee');
    await user.click(screen.getByRole('radio', { name: 'Nonaktif' }));
    expect(onParamsChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'INACTIVE', page: undefined, search: 'Test' }));
  });
  it('validates required fields without creating an account', async () => {
    const { user, api } = setup(); await user.click(await screen.findByRole('button', { name: 'Tambah' })); await screen.findByLabelText('NIK');
    await user.click(screen.getByRole('button', { name: 'Buat karyawan' }));
    expect(await screen.findByText('Masukkan email yang valid.')).toBeInTheDocument(); expect(screen.getByText('Pilih departemen aktif.')).toBeInTheDocument(); expect(api.mock.calls.some(([path]) => path === 'employees')).toBe(false);
  });
  it('submits a stable idempotency key and removes password from DOM after close', async () => {
    const { user, api } = setup(); await fill(user); await user.click(screen.getByRole('button', { name: 'Buat karyawan' }));
    const dialog = await screen.findByRole('dialog'); expect(within(dialog).getByLabelText('Password sementara')).toHaveValue('one-time-ui-test-password');
    const call = api.mock.calls.find(([path]) => path === 'employees'); expect(call?.[1]).toMatchObject({ method: 'POST', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/), body: { nik: 'EMP-02', name: 'New Employee', email: 'new@example.test' } });
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    await user.click(within(dialog).getByRole('button', { name: 'Selesai' })); await waitFor(() => expect(screen.queryByDisplayValue('one-time-ui-test-password')).not.toBeInTheDocument());
  });
  it('reports an expired session', async () => {
    const { onSessionExpired } = setup('', async () => { throw new AuthError(401, 'Sesi berakhir.'); });
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
  it('requires confirmation before requesting a replacement for consumed credential', async () => {
    const { user, api } = setup('operation=' + id, async (path, init) => {
      if (path.startsWith('employees?')) return { items: [employee], total: 1, page: 1, pageSize: 20 };
      if (path.endsWith('/credentials')) { if (!(init?.body as { recover?: boolean })?.recover) throw new AuthError(409, 'Password sudah ditampilkan.'); return { email: employee.email, temporaryPassword: 'replacement-ui-test-password' }; }
      return completed;
    });
    await user.click(await screen.findByRole('button', { name: 'Buat pengganti' }));
    const dialog = await screen.findByRole('dialog'); expect(within(dialog).getByText(/sesi lama dibatalkan/)).toBeInTheDocument();
    expect(api.mock.calls.some(([path]) => path.endsWith('/credentials'))).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Buat pengganti' }));
    expect(await screen.findByDisplayValue('replacement-ui-test-password')).toBeInTheDocument();
  });
  it('loads master options beyond page one and filters inactive rows', async () => {
    const api = vi.fn(async (path: string) => path.endsWith('page=1') ? { items: [master], total: 2, page: 1, pageSize: 1 } : { items: [{ ...master, id: 'second', name: 'Pilihan halaman kedua' }, { ...master, id: 'inactive', status: 'INACTIVE' }], total: 2, page: 2, pageSize: 1 });
    const rows = await loadActiveMasters({ api: api as never }, 'positions'); expect(rows.map(row => row.id)).toEqual([id, 'second']); expect(api).toHaveBeenCalledTimes(2);
  });
  it('repairs a conflicting email on the same operation without a second create', async () => {
    const { user, api } = setup('operation=' + id, async (path) => {
      if (path.startsWith('employees?')) return { items: [], total: 0, page: 1, pageSize: 20 };
      if (path.endsWith('/retry')) return completed;
      if (path.endsWith('/credentials')) return { email: 'corrected@example.test', temporaryPassword: 'corrected-ui-test-password' };
      return { ...completed, status: 'FAILED', errorCode: 'EMAIL_CONFLICT', canCorrectEmail: true };
    });
    await user.type(await screen.findByLabelText('Email pengganti'), 'corrected@example.test');
    await user.click(screen.getByRole('button', { name: 'Perbaiki email' }));
    expect(await screen.findByDisplayValue('corrected-ui-test-password')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('employee-provisioning/' + id + '/retry', { method: 'POST', body: { email: 'corrected@example.test' } });
    expect(api.mock.calls.some(([path]) => path === 'employees')).toBe(false);
  });
});
