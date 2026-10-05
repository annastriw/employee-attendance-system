import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HolidaysPage } from './HolidaysPage';
import { AuthError } from '../lib/auth-client';
import type { HolidayRecord } from '../lib/holidays';

const futureHoliday: HolidayRecord = {
  id: 'h-1',
  holidayDate: '2026-12-25',
  description: 'Hari Raya Natal',
  isPast: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const pastHoliday: HolidayRecord = {
  id: 'h-2',
  holidayDate: '2026-08-17',
  description: 'Hari Kemerdekaan RI',
  isPast: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function setup(rows: HolidayRecord[] = [futureHoliday, pastHoliday], params = '', fail?: Error) {
  const api = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (fail) throw fail;
    if (!init?.method) {
      return { data: rows, items: rows, total: rows.length, page: 1, pageSize: 20, meta: { total: rows.length, page: 1, pageSize: 20, totalPages: 1 } };
    }
    if (path === 'holidays' && init.method === 'POST') {
      const b = (init.body ?? {}) as Record<string, unknown>;
      return { data: { id: 'new-id', ...b, isPast: false, createdAt: '', updatedAt: '' } };
    }
    if (path.startsWith('holidays/') && init.method === 'PATCH') {
      const b = (init.body ?? {}) as Record<string, unknown>;
      return { data: { ...futureHoliday, ...b } };
    }
    if (path.startsWith('holidays/') && init.method === 'DELETE') {
      return { data: { id: 'h-1', message: 'Hari libur berhasil dihapus.' } };
    }
    return { data: futureHoliday };
  });

  const onParamsChange = vi.fn();
  const onSessionExpired = vi.fn();

  render(
    <HolidaysPage
      client={{ api: api as never }}
      params={new URLSearchParams(params)}
      onParamsChange={onParamsChange}
      onSessionExpired={onSessionExpired}
    />,
  );

  return { api, onParamsChange, onSessionExpired, user: userEvent.setup() };
}

describe('HolidaysPage (H13)', () => {
  it('sends search/range/page together and applies a date preset without keeping legacy filters', async () => {
    const { api, onParamsChange, user } = setup([futureHoliday], 'search=Natal&startDate=2026-12-01&endDate=2026-12-31&page=3');
    await screen.findByRole('grid', { name: 'Daftar hari libur' });
    const query = new URLSearchParams(api.mock.calls.find(([path]) => path.startsWith('holidays?'))![0].split('?')[1]);
    expect(query.get('search')).toBe('Natal'); expect(query.get('startDate')).toBe('2026-12-01');
    expect(query.get('endDate')).toBe('2026-12-31'); expect(query.get('page')).toBe('3');
    await user.click(screen.getByRole('button', { name: 'Buka filter' }));
    await user.click(await screen.findByRole('button', { name: /Buka kalender rentang tanggal/ }));
    await user.click(await screen.findByRole('button', { name: '7 hari' }));
    expect(onParamsChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Natal', startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), page: undefined }));
    expect(onParamsChange.mock.calls.at(-1)![0]).not.toHaveProperty('year');
    expect(onParamsChange.mock.calls.at(-1)![0]).not.toHaveProperty('month');
  });

  it('lists holidays with status badges and disables action buttons for past dates', async () => {
    setup();

    const table = await screen.findByRole('grid', { name: 'Daftar hari libur' });
    expect(await within(table).findByText('Hari Raya Natal')).toBeInTheDocument();
    expect(within(table).getByText('Hari Kemerdekaan RI')).toBeInTheDocument();

    // Future holiday: edit and delete buttons are enabled
    const editFuture = screen.getByRole('button', { name: 'Ubah Hari Raya Natal' });
    const deleteFuture = screen.getByRole('button', { name: 'Hapus Hari Raya Natal' });
    expect(editFuture).toBeEnabled();
    expect(deleteFuture).toBeEnabled();

    // Past holiday: edit and delete buttons are disabled
    const editPast = screen.getByRole('button', { name: 'Ubah Hari Kemerdekaan RI' });
    const deletePast = screen.getByRole('button', { name: 'Hapus Hari Kemerdekaan RI' });
    expect(editPast).toBeDisabled();
    expect(deletePast).toBeDisabled();

    // Status badges
    expect(within(table).getByText('Mendatang')).toBeInTheDocument();
    expect(within(table).getByText('Lampau')).toBeInTheDocument();
  });

  it('opens a past holiday in a read-only view from its row', async () => {
    const { user } = setup([pastHoliday]);
    const table = await screen.findByRole('grid', { name: 'Daftar hari libur' });
    await user.click(within(table).getByText('Hari Kemerdekaan RI'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Keterangan', { exact: false })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Tutup' })).toBeEnabled();
  });

  it('separates a first-run empty state from a filter with no results', async () => {
    setup([]);
    expect(await screen.findByText('Tidak ada hari libur yang cocok')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tambah Hari Libur' })).toHaveLength(1);
  });

  it('offers clearing filters when search finds nothing', async () => {
    const { onParamsChange, user } = setup([], 'search=xyz');
    expect(await screen.findByText('Tidak ada hari libur yang cocok')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bersihkan filter' }));
    expect(onParamsChange).toHaveBeenCalledWith({});
  });

  it('validates, normalises and creates a new holiday', async () => {
    const { api, user } = setup([futureHoliday]);
    await screen.findByText('Hari Raya Natal');

    await user.click(screen.getByRole('button', { name: 'Tambah Hari Libur' }));
    const dialog = await screen.findByRole('dialog');

    // Attempt to submit empty description
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));
    expect(within(dialog).getByText('Keterangan tidak boleh kosong.')).toBeInTheDocument();

    // Fill valid date and description
    const descInput = within(dialog).getByLabelText('Keterangan', { exact: false });
    await user.type(descInput, 'Tahun Baru 2027');

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        'holidays',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            description: 'Tahun Baru 2027',
          }),
        }),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent('berhasil ditambahkan');
  });

  it('shows date conflict error next to date field if already registered', async () => {
    const { api, user } = setup([futureHoliday]);
    api.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === 'POST') {
        throw new AuthError(409, 'Hari libur untuk tanggal tersebut sudah terdaftar.');
      }
      return {
        data: [futureHoliday],
        items: [futureHoliday],
        total: 1,
        page: 1,
        pageSize: 20,
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      };
    });

    await screen.findByText('Hari Raya Natal');
    await user.click(screen.getByRole('button', { name: 'Tambah Hari Libur' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText('Keterangan', { exact: false }), 'Natal Lagi');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(await within(dialog).findByText('Hari libur untuk tanggal tersebut sudah terdaftar.')).toBeInTheDocument();
  });

  it('opens edit dialog and updates holiday description', async () => {
    const { api, user } = setup([futureHoliday]);
    await screen.findByText('Hari Raya Natal');

    await user.click(screen.getByRole('button', { name: 'Ubah Hari Raya Natal' }));
    const dialog = await screen.findByRole('dialog');

    const descInput = within(dialog).getByLabelText('Keterangan', { exact: false });
    await user.clear(descInput);
    await user.type(descInput, 'Hari Raya Natal Bersama');

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        `holidays/${futureHoliday.id}`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.objectContaining({
            description: 'Hari Raya Natal Bersama',
          }),
        }),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent('berhasil diperbarui');
  });

  it('asks for confirmation before deleting a holiday', async () => {
    const { api, user } = setup([futureHoliday]);
    await screen.findByText('Hari Raya Natal');

    await user.click(screen.getByRole('button', { name: 'Hapus Hari Raya Natal' }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveTextContent('Apakah Anda yakin ingin menghapus hari libur');
    expect(dialog).toHaveTextContent('Hari Raya Natal');

    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        `holidays/${futureHoliday.id}`,
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    expect(await screen.findByRole('status')).toHaveTextContent('berhasil dihapus');
  });

  it('triggers onSessionExpired on 401 AuthError', async () => {
    const { onSessionExpired } = setup([], '', new AuthError(401, 'Sesi tidak valid.'));
    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalled();
    });
  });
});
