import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeesPage } from './EmployeesPage';

describe('Employee category filters through shared overlays', () => {
  it('combines categories/status/search, resets pagination and clears each category', async () => {
    const departmentId = '3b81c559-bfef-11f1-85c7-76e03cd5f3d3';
    const positionId = 'c2345678-1234-4234-8234-123456789012';
    const api = vi.fn(async (path: string) => {
      const items = path.startsWith('departments?') ? [{ id: departmentId, name: 'Operasional', status: 'ACTIVE' }]
        : path.startsWith('positions?') ? [{ id: positionId, name: 'Analis', status: 'ACTIVE' }] : [];
      return { items, total: items.length, page: 1, pageSize: 100 };
    });
    const client = { api: api as never };
    const sessionExpired = vi.fn();
    function Harness() {
      const [params, setParams] = useState(new URLSearchParams('page=2'));
      return <EmployeesPage client={client} params={params} onSessionExpired={sessionExpired}
        onParamsChange={next => setParams(new URLSearchParams(Object.entries(next).filter((entry): entry is [string, string] => entry[1] !== undefined)))} />;
    }
    render(<Harness />);
    const user = userEvent.setup();
    const expectQuery = async (expected: Record<string, string | null>) => waitFor(() => {
      const calls = api.mock.calls.filter(([path]) => path.startsWith('employees?'));
      const query = new URLSearchParams(calls.at(-1)![0].split('?')[1]);
      for (const [key, value] of Object.entries(expected)) expect(query.get(key)).toBe(value);
    });
    const select = async (label: string, name: string) => {
      await user.click(screen.getByRole('button', { name: 'Buka filter' }));
      await user.click(await screen.findByRole('button', { name: label }));
      await user.click(await screen.findByRole('menuitemradio', { name }));
      await user.keyboard('{Escape}');
    };
    await screen.findByText('Belum ada karyawan');
    await select('Filter departemen', 'Operasional');
    await expectQuery({ departmentId, page: '1' });
    await select('Filter jabatan', 'Analis');
    await expectQuery({ departmentId, positionId, page: '1' });
    await user.click(screen.getByRole('radio', { name: 'Nonaktif' }));
    await user.type(screen.getByRole('searchbox', { name: 'Cari karyawan' }), 'Sari');
    await expectQuery({ departmentId, positionId, status: 'INACTIVE', search: 'Sari', page: '1' });
    await select('Filter departemen', 'Semua departemen');
    await expectQuery({ departmentId: null, positionId, status: 'INACTIVE', search: 'Sari' });
    await user.click(screen.getByRole('button', { name: 'Hapus filter Analis' }));
    await expectQuery({ positionId: null, status: 'INACTIVE', search: 'Sari' });
    await user.click(within(screen.getByLabelText('Filter aktif')).getByRole('button', { name: 'Reset filter' }));
    await expectQuery({ departmentId: null, positionId: null, status: null, search: null, page: '1' });
  });
});
