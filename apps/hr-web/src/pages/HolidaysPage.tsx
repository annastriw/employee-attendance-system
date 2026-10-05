import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Skeleton,
  Table,
} from '@heroui/react';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { Notice, StatusPill, ConfirmDialog, SearchInput, PageHeader, FilterPanel, DateRangeField, listDateRange, rangeQuery } from "@attendance/ui";

import { HolidayFormDialog } from '../components/organisms/HolidayFormDialog';
import { InteractiveTableRow } from '../components/molecules/InteractiveTableRow';
import { AuthError, type AuthClient } from '../lib/auth-client';
import {
  holidaysApi,
  type HolidayPage,
  type HolidayRecord,
} from '../lib/holidays';

const PAGE_SIZE = 20;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatIndonesianDate(dateStr: string): { formatted: string; dayName: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayName = DAY_NAMES[dateObj.getUTCDay()];
  const formatted = `${d} ${MONTH_NAMES[m - 1]} ${y}`;
  return { formatted, dayName };
}

function getTodayWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.';

export function HolidaysPage({
  client,
  params,
  onParamsChange,
  onSessionExpired,
}: {
  client: Pick<AuthClient, 'api'>;
  params: URLSearchParams;
  onParamsChange: (next: Record<string, string | undefined>) => void;
  onSessionExpired: () => void;
}) {
  const api = useMemo(() => holidaysApi(client), [client]);
  const todayWIB = useMemo(() => getTodayWIB(), []);

  const search = params.get('search') ?? '';
  const yearParam = params.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const monthParam = params.get('month');
  const month = monthParam ? Number(monthParam) : undefined;
  const range = year || month ? null : listDateRange(params);
  const startDate = range?.startDate, endDate = range?.endDate;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [data, setData] = useState<HolidayPage | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const key = `${search}|${year ?? ''}|${month ?? ''}|${startDate ?? ''}|${endDate ?? ''}|${page}|${reload}`;
  const [loadedKey, setLoadedKey] = useState('');
  const loading = loadedKey !== key;

  const [query, setQuery] = useState(search);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<{ record?: HolidayRecord } | null>(null);
  const [toDelete, setToDelete] = useState<HolidayRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const setFilters = useCallback(
    (next: { search?: string; year?: number; month?: number; page?: number; startDate?: string; endDate?: string; period?: string }) => {
      const merged = { search, year, month, startDate, endDate, period: params.get("period") ?? undefined, page, ...next };
      onParamsChange({
        search: merged.search || undefined,
        startDate: merged.startDate, endDate: merged.endDate, period: merged.period,
        year: merged.year ? String(merged.year) : undefined,
        month: merged.month ? String(merged.month) : undefined,
        page: merged.page > 1 ? String(merged.page) : undefined,
      });
    },
    [month, onParamsChange, page, search, year, startDate, endDate, params],
  );

  const handle = useCallback(
    (error: unknown) => {
      if (error instanceof AuthError && error.status === 401) onSessionExpired();
      return message(error);
    },
    [onSessionExpired],
  );

  useEffect(() => {
    let active = true;
    api
      .list({
        search: search || undefined,
        year,
        month, startDate, endDate,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((result) => {
        if (active) {
          setData(result);
          setLoadError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(handle(error));
      })
      .finally(() => {
        if (active) setLoadedKey(key);
      });
    return () => {
      active = false;
    };
  }, [api, handle, key, month, page, search, year, startDate, endDate]);

  function refresh() {
    setReload((r) => r + 1);
  }

  async function run<T>(action: () => Promise<T>, successMsg: (val: T) => string) {
    setBusy(true);
    setActionError('');
    setSuccess('');
    try {
      const res = await action();
      setForm(null);
      setToDelete(null);
      setSuccess(successMsg(res));
      refresh();
    } catch (err) {
      setActionError(handle(err));
    } finally {
      setBusy(false);
    }
  }

  const items = data?.data ?? data?.items ?? [];
  const total = data?.meta?.total ?? data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const filtered = Boolean(search || year || month || startDate || endDate);

  return (
    <div className="holidays-page">
      <PageHeader title="Hari Libur" breadcrumb={[{ label: "Master data" }, { label: "Hari Libur" }]} actions={        <Button
          variant="primary"
          onPress={() => {
            setActionError('');
            setForm({});
          }}
        >
          <Plus size={16} aria-hidden="true" />
          Tambah Hari Libur
        </Button>} />
      <div className="list-toolbar">
        <SearchInput label="Cari keterangan hari libur" value={query} onChange={setQuery} onSearch={value => setFilters({ search: value.trim(), page: 1 })} placeholder="Cari keterangan hari libur" />

        <FilterPanel active={[
          ...(range || year || month ? [{ key: "period", label: year || month ? [year, month].filter(Boolean).join(" / ") : range ? range.startDate + " s.d. " + range.endDate : "Semua tanggal", onRemove: () => onParamsChange({ search: search || undefined, ...rangeQuery(null) }) }] : []),
          ...(search ? [{ key: "search", label: search, onRemove: () => { setQuery(''); setFilters({ search: '', page: 1 }); } }] : []),
        ]} onReset={() => { setQuery(''); onParamsChange(rangeQuery(null)); }}>
          <DateRangeField value={range} onChange={value => onParamsChange({ search: search || undefined, ...rangeQuery(value) })} />
        </FilterPanel>
      </div>

      {success && <Notice message={success} success />}
      {actionError && !form && !toDelete && <Notice message={actionError} />}
      {loadError && (
        <div className="load-error">
          <Notice message={loadError} />
          <Button variant="secondary" size="sm" onPress={refresh}>
            Coba lagi
          </Button>
        </div>
      )}

      {loading ? (
        <div className="table-skeleton" aria-busy="true" aria-label="Memuat daftar hari libur">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="skeleton-row" />
          ))}
        </div>
      ) : !loadError && items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <CalendarBlank size={22} />
          </span>
          {filtered ? (
            <>
              <p className="empty-title">Tidak ada hari libur yang cocok</p>
              <p className="empty-body">Ubah kata kunci pencarian atau bersihkan filter.</p>
              <Button
                variant="secondary"
                size="sm"
                className="empty-action"
                onPress={() => {
                  setQuery('');
                  onParamsChange({});
                }}
              >
                Bersihkan filter
              </Button>
            </>
          ) : (
            <>
              <p className="empty-title">Belum ada hari libur terdaftar</p>
              <p className="empty-body">
                Tambahkan hari libur nasional atau kebijakan libur khusus perusahaan.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="empty-action"
                onPress={() => {
                  setActionError('');
                  setForm({});
                }}
              >
                <Plus size={16} aria-hidden="true" />
                Tambah Hari Libur
              </Button>
            </>
          )}
        </div>
      ) : (
        items.length > 0 && (
          <>
            <Table className="data-table" aria-busy={loading}>
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Daftar hari libur"
                  className="data-table-content"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Tanggal</Table.Column>
                    <Table.Column>Hari</Table.Column>
                    <Table.Column>Keterangan</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column className="col-actions">
                      <span className="sr-only">Tindakan</span>
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {items.map((record) => {
                      const { formatted, dayName } = formatIndonesianDate(
                        record.holidayDate,
                      );
                      const isPast =
                        record.isPast ?? record.holidayDate < todayWIB;
                      const isToday = record.holidayDate === todayWIB;

                      return (
                        <InteractiveTableRow key={record.id} id={record.id}
                          label={`Lihat hari libur ${formatted}`}
                          onActivate={() => { setActionError(''); setForm({ record }); }}>
                          <Table.Cell data-label="Tanggal" className="cell-strong tabular">
                            {formatted}
                          </Table.Cell>
                          <Table.Cell data-label="Hari">{dayName}</Table.Cell>
                          <Table.Cell data-label="Keterangan">{record.description}</Table.Cell>
                          <Table.Cell data-label="Status">
                            {isPast ? (
                              <StatusPill tone="inactive" label="Lampau" />
                            ) : isToday ? (
                              <StatusPill tone="active" label="Hari Ini" />
                            ) : (
                              <StatusPill tone="archived" label="Mendatang" />
                            )}
                          </Table.Cell>
                          <Table.Cell data-label="Aksi" className="col-actions">
                            <div className="row-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Ubah ${record.description}`}
                                isDisabled={busy || isPast}
                                onClick={event => event.stopPropagation()}
                                onPress={() => {
                                  setActionError('');
                                  setForm({ record });
                                }}
                              >
                                <PencilSimple size={16} aria-hidden="true" />
                                <span className="action-label">Ubah</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                isDisabled={busy || isPast}
                                aria-label={`Hapus ${record.description}`}
                                onClick={event => event.stopPropagation()}
                                onPress={() => {
                                  setActionError('');
                                  setToDelete(record);
                                }}
                              >
                                <Trash size={16} aria-hidden="true" />
                                <span className="action-label">Hapus</span>
                              </Button>
                            </div>
                          </Table.Cell>
                        </InteractiveTableRow>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            <nav className="list-pager" aria-label="Halaman hari libur">
              <span className="list-pager-range">
                {from}-{to} dari {total}
              </span>
              <div className="list-pager-buttons">
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  aria-label="Halaman sebelumnya"
                  isDisabled={page <= 1 || loading}
                  onPress={() => setFilters({ page: page - 1 })}
                >
                  <CaretLeft size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  aria-label="Halaman berikutnya"
                  isDisabled={page >= lastPage || loading}
                  onPress={() => setFilters({ page: page + 1 })}
                >
                  <CaretRight size={16} aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </>
        )
      )}

      {form && (
        <HolidayFormDialog
          open
          record={form.record}
          readOnly={form.record ? form.record.holidayDate < todayWIB : false}
          todayWIB={todayWIB}
          busy={busy}
          error={actionError}
          onClose={() => setForm(null)}
          onSubmit={(input) =>
            void run(
              () =>
                form.record
                  ? api.update(form.record.id, input)
                  : api.create(input),
              (res) =>
                `Hari libur ${res.data.description} (${res.data.holidayDate}) ${
                  form.record ? 'berhasil diperbarui' : 'berhasil ditambahkan'
                }.`,
            )
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Hapus Hari Libur?"
        confirmLabel="Hapus"
        busy={busy}
        error={actionError}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          void run(
            () => api.delete(toDelete.id),
            () => `Hari libur ${toDelete.description} berhasil dihapus.`,
          )
        }
      >
        <p className="dialog-text">
          Apakah Anda yakin ingin menghapus hari libur untuk tanggal{' '}
          <strong>
            {toDelete && formatIndonesianDate(toDelete.holidayDate).formatted}
          </strong>{' '}
          (<em>{toDelete?.description}</em>)? Hari tersebut akan kembali
          dievaluasi sebagai jadwal kerja normal.
        </p>
      </ConfirmDialog>
    </div>
  );
}
