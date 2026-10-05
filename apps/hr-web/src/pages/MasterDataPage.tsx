import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Skeleton, Table, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { Buildings, CaretLeft, CaretRight, PencilSimple, Plus, Power } from "@phosphor-icons/react";
import { Notice, StatusBadge, ConfirmDialog, SearchInput, PageHeader } from "@attendance/ui";

import { MasterFormDialog } from "../components/organisms/MasterFormDialog";
import { InteractiveTableRow } from "../components/molecules/InteractiveTableRow";
import { AuthError, type AuthClient } from "../lib/auth-client";
import { masterDataApi, PAGE_SIZE, type MasterRecord, type MasterRecordPage, type MasterStatus } from "../lib/master-data";

type Filter = "ALL" | MasterStatus;
const message = (error: unknown) => (error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.");

export function MasterDataPage({ client, params, onParamsChange, onSessionExpired, resource }: {
  resource: "departments" | "positions";
  client: Pick<AuthClient, "api">;
  params: URLSearchParams;
  onParamsChange: (next: Record<string, string | undefined>) => void;
  onSessionExpired: () => void;
}) {
  const label = resource === "departments" ? "departemen" : "jabatan";
  const api = useMemo(() => masterDataApi(client, resource), [client, resource]);
  const search = params.get("search") ?? "";
  const status: Filter = params.get("status") === "ACTIVE" || params.get("status") === "INACTIVE"
    ? (params.get("status") as MasterStatus) : "ALL";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [data, setData] = useState<MasterRecordPage | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${search}|${status}|${page}|${reload}`;
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== key;
  const [query, setQuery] = useState(search);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<{ record?: MasterRecord } | null>(null);
  const [confirm, setConfirm] = useState<MasterRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const setFilters = useCallback((next: { search?: string; status?: Filter; page?: number }) => {
    const merged = { search, status, page, ...next };
    onParamsChange({
      search: merged.search || undefined,
      status: merged.status === "ALL" ? undefined : merged.status,
      page: merged.page > 1 ? String(merged.page) : undefined,
    });
  }, [onParamsChange, page, search, status]);

  const handle = useCallback((error: unknown) => {
    if (error instanceof AuthError && error.status === 401) onSessionExpired();
    return message(error);
  }, [onSessionExpired]);

  useEffect(() => {
    let active = true;
    api.list({ search: search || undefined, status: status === "ALL" ? undefined : status, page })
      .then((result) => { if (active) { setData(result); setLoadError(""); } })
      .catch((error: unknown) => { if (active) setLoadError(handle(error)); })
      .finally(() => { if (active) setLoadedKey(key); });
    return () => { active = false; };
  }, [api, handle, key, page, search, status]);
  const refresh = () => setReload((value) => value + 1);

  async function run(action: () => Promise<MasterRecord>, done: (record: MasterRecord) => string) {
    setBusy(true);
    setActionError("");
    try {
      const record = await action();
      setSuccess(done(record));
      setForm(null);
      setConfirm(null);
      refresh();
    } catch (error) {
      setActionError(handle(error));
    } finally {
      setBusy(false);
    }
  }

  const openForm = (record?: MasterRecord) => { setActionError(""); setSuccess(""); setForm({ record }); };
  const toggle = (record: MasterRecord) => {
    setSuccess("");
    if (record.status === "ACTIVE") { setActionError(""); setConfirm(record); return; }
    void run(() => api.setStatus(record.id, "ACTIVE"), (d) => `${d.name} diaktifkan kembali.`);
  };

  const filtered = Boolean(search) || status !== "ALL";
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="list-page">
      <PageHeader title={resource === "departments" ? "Departemen" : "Jabatan"}
        breadcrumb={[{ label: "Master data" }, { label: resource === "departments" ? "Departemen" : "Jabatan" }]}
        actions={        <Button variant="primary"  onPress={() => openForm()}>
          <Plus size={16} aria-hidden="true" />Tambah
        </Button>} />
      <div className="list-toolbar" role="search">
        <SearchInput label={`Cari ${label}`} value={query} onChange={setQuery} onSearch={value => setFilters({ search: value.trim(), page: 1 })} placeholder="Cari nama atau kode" />
        <ToggleButtonGroup aria-label="Filter status" selectionMode="single" disallowEmptySelection
          selectedKeys={[status]} size="sm" className="status-filter"
          onSelectionChange={(keys) => { const [key] = [...keys]; if (key) setFilters({ status: key as Filter, page: 1 }); }}>
          <ToggleButton id="ALL">Semua</ToggleButton>
          <ToggleButton id="ACTIVE"><ToggleButtonGroup.Separator />Aktif</ToggleButton>
          <ToggleButton id="INACTIVE"><ToggleButtonGroup.Separator />Nonaktif</ToggleButton>
        </ToggleButtonGroup>
        {filtered && <Button size="sm" variant="ghost" onPress={() => { setQuery(""); onParamsChange({}); }}>Reset filter</Button>}
      </div>

      {success && <Notice message={success} success />}
      {actionError && !form && !confirm && <Notice message={actionError} />}
      {loadError && (
        <div className="load-error">
          <Notice message={loadError} />
          <Button variant="secondary" size="sm" onPress={refresh}>Coba lagi</Button>
        </div>
      )}

      {loading ? (
        <div className="table-skeleton" aria-busy="true" aria-label={`Memuat ${label}`}>
          {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="skeleton-row" />)}
        </div>
      ) : !loadError && items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true"><Buildings size={22} /></span>
          {filtered ? (
            <>
              <p className="empty-title">Tidak ada {label} yang cocok</p>
              <p className="empty-body">Ubah kata kunci atau status pencarian.</p>
              <Button variant="secondary" size="sm" className="empty-action"
                onPress={() => { setQuery(""); onParamsChange({}); }}>Bersihkan filter</Button>
            </>
          ) : (
            <>
              <p className="empty-title">Belum ada {label}</p>
              <p className="empty-body">Tambahkan {label} agar bisa dipakai saat membuat data karyawan.</p>
              <Button variant="primary" size="sm" className="empty-action" onPress={() => openForm()}>
                <Plus size={16} aria-hidden="true" />Tambah {label}
              </Button>
            </>
          )}
        </div>
      ) : items.length > 0 && (
        <>
          <Table className="data-table" aria-busy={loading}>
            <Table.ScrollContainer>
              <Table.Content aria-label={`Daftar ${label}`} className="data-table-content">
                <Table.Header>
                  <Table.Column isRowHeader>Nama</Table.Column>
                  <Table.Column className="col-code">Kode</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column className="col-actions"><span className="sr-only">Tindakan</span></Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((record) => (
                    <InteractiveTableRow key={record.id} id={record.id}
                      label={`Ubah ${record.name}`} onActivate={() => openForm(record)}>
                      <Table.Cell data-label="Nama" className="cell-strong">{record.name}</Table.Cell>
                      <Table.Cell data-label="Kode" className="col-code"><span className="code-pill tabular">{record.code}</span></Table.Cell>
                      <Table.Cell data-label="Status"><StatusBadge status={record.status} /></Table.Cell>
                      <Table.Cell data-label="Aksi" className="col-actions">
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" aria-label={`Ubah ${record.name}`} isDisabled={busy}
                            onClick={event => event.stopPropagation()} onPress={() => openForm(record)}>
                            <PencilSimple size={16} aria-hidden="true" /><span className="action-label">Ubah</span>
                          </Button>
                          <Button variant="ghost" size="sm" isDisabled={busy} onClick={event => event.stopPropagation()} onPress={() => void toggle(record)}
                            aria-label={`${record.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"} ${record.name}`}>
                            <Power size={16} aria-hidden="true" />
                            <span className="action-label">{record.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                          </Button>
                        </div>
                      </Table.Cell>
                    </InteractiveTableRow>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <nav className="list-pager" aria-label={`Halaman ${label}`}>
            <span className="list-pager-range">{from}-{to} dari {total}</span>
            <div className="list-pager-buttons">
              <Button variant="secondary" size="sm" isIconOnly aria-label="Halaman sebelumnya" isDisabled={page <= 1 || loading}
                onPress={() => setFilters({ page: page - 1 })}><CaretLeft size={16} aria-hidden="true" /></Button>
              <Button variant="secondary" size="sm" isIconOnly aria-label="Halaman berikutnya" isDisabled={page >= lastPage || loading}
                onPress={() => setFilters({ page: page + 1 })}><CaretRight size={16} aria-hidden="true" /></Button>
            </div>
          </nav>
        </>
      )}

      {form && (
        <MasterFormDialog open record={form.record} label={label} busy={busy} error={actionError}
          onClose={() => setForm(null)}
          onSubmit={(input) => void run(
            () => (form.record ? api.update(form.record.id, input) : api.create(input)),
            (d) => `${d.name} ${form.record ? "diperbarui" : "ditambahkan"}.`,
          )} />
      )}
      <ConfirmDialog open={Boolean(confirm)} title={`Nonaktifkan ${label}?`} confirmLabel="Nonaktifkan"
        busy={busy} error={actionError} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && void run(() => api.setStatus(confirm.id, "INACTIVE"), (d) => `${d.name} dinonaktifkan.`)}>
        <p className="dialog-text">
          <strong>{confirm?.name}</strong> tidak bisa dipilih untuk penugasan karyawan baru.
          Data dan riwayat tetap tersimpan, dan {label} dapat diaktifkan kembali.
        </p>
      </ConfirmDialog>
    </div>
  );
}
