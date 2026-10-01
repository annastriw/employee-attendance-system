import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, SearchField, Skeleton, Table, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { Buildings, CaretLeft, CaretRight, PencilSimple, Plus, Power } from "@phosphor-icons/react";
import { Notice } from "../components/molecules/Notice";
import { StatusBadge } from "../components/molecules/StatusBadge";
import { ConfirmDialog } from "../components/organisms/ConfirmDialog";
import { DepartmentFormDialog } from "../components/organisms/DepartmentFormDialog";
import { AuthError, type AuthClient } from "../lib/auth-client";
import { departmentsApi, PAGE_SIZE, type Department, type DepartmentPage, type MasterStatus } from "../lib/departments";

type Filter = "ALL" | MasterStatus;
const message = (error: unknown) => (error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.");

export function DepartmentsPage({ client, params, onParamsChange, onSessionExpired }: {
  client: Pick<AuthClient, "api">;
  params: URLSearchParams;
  onParamsChange: (next: Record<string, string | undefined>) => void;
  onSessionExpired: () => void;
}) {
  const api = useMemo(() => departmentsApi(client), [client]);
  const search = params.get("search") ?? "";
  const status: Filter = params.get("status") === "ACTIVE" || params.get("status") === "INACTIVE"
    ? (params.get("status") as MasterStatus) : "ALL";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [data, setData] = useState<DepartmentPage | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${search}|${status}|${page}|${reload}`;
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== key;
  const [query, setQuery] = useState(search);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<{ department?: Department } | null>(null);
  const [confirm, setConfirm] = useState<Department | null>(null);
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

  // Debounce typing; a new search always starts from the first page.
  const typing = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (query.trim() === search) return;
    window.clearTimeout(typing.current);
    typing.current = window.setTimeout(() => setFilters({ search: query.trim(), page: 1 }), 300);
    return () => window.clearTimeout(typing.current);
  }, [query, search, setFilters]);

  async function run(action: () => Promise<Department>, done: (department: Department) => string) {
    setBusy(true);
    setActionError("");
    try {
      const department = await action();
      setSuccess(done(department));
      setForm(null);
      setConfirm(null);
      refresh();
    } catch (error) {
      setActionError(handle(error));
    } finally {
      setBusy(false);
    }
  }

  const openForm = (department?: Department) => { setActionError(""); setSuccess(""); setForm({ department }); };
  const toggle = (department: Department) => {
    setSuccess("");
    if (department.status === "ACTIVE") { setActionError(""); setConfirm(department); return; }
    void run(() => api.setStatus(department.id, "ACTIVE"), (d) => `${d.name} diaktifkan kembali.`);
  };

  const filtered = Boolean(search) || status !== "ALL";
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="list-page">
      <div className="list-toolbar" role="search">
        <SearchField className="list-search" value={query} onChange={setQuery} aria-label="Cari departemen">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari nama atau kode" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <ToggleButtonGroup aria-label="Filter status" selectionMode="single" disallowEmptySelection
          selectedKeys={[status]} size="sm" className="status-filter"
          onSelectionChange={(keys) => { const [key] = [...keys]; if (key) setFilters({ status: key as Filter, page: 1 }); }}>
          <ToggleButton id="ALL">Semua</ToggleButton>
          <ToggleButton id="ACTIVE">Aktif</ToggleButton>
          <ToggleButton id="INACTIVE">Nonaktif</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="primary" className="list-add" onPress={() => openForm()}>
          <Plus size={16} aria-hidden="true" />Tambah
        </Button>
      </div>

      {success && <Notice message={success} success />}
      {loadError && (
        <div className="load-error">
          <Notice message={loadError} />
          <Button variant="secondary" size="sm" onPress={refresh}>Coba lagi</Button>
        </div>
      )}

      {loading && !data ? (
        <div className="table-skeleton" aria-busy="true" aria-label="Memuat departemen">
          {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="skeleton-row" />)}
        </div>
      ) : !loadError && items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true"><Buildings size={22} /></span>
          {filtered ? (
            <>
              <p className="empty-title">Tidak ada departemen yang cocok</p>
              <p className="empty-body">Ubah kata kunci atau status pencarian.</p>
              <Button variant="secondary" size="sm" className="empty-action"
                onPress={() => { setQuery(""); onParamsChange({}); }}>Bersihkan filter</Button>
            </>
          ) : (
            <>
              <p className="empty-title">Belum ada departemen</p>
              <p className="empty-body">Tambahkan departemen agar bisa dipakai saat membuat data karyawan.</p>
              <Button variant="primary" size="sm" className="empty-action" onPress={() => openForm()}>
                <Plus size={16} aria-hidden="true" />Tambah departemen
              </Button>
            </>
          )}
        </div>
      ) : items.length > 0 && (
        <>
          <Table className="data-table" aria-busy={loading}>
            <Table.ScrollContainer>
              <Table.Content aria-label="Daftar departemen" className="data-table-content">
                <Table.Header>
                  <Table.Column isRowHeader>Nama</Table.Column>
                  <Table.Column className="col-code">Kode</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column className="col-actions"><span className="sr-only">Tindakan</span></Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((department) => (
                    <Table.Row key={department.id} id={department.id}>
                      <Table.Cell className="cell-strong">{department.name}</Table.Cell>
                      <Table.Cell className="col-code"><span className="code-pill tabular">{department.code}</span></Table.Cell>
                      <Table.Cell><StatusBadge status={department.status} /></Table.Cell>
                      <Table.Cell className="col-actions">
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" aria-label={`Ubah ${department.name}`} isDisabled={busy}
                            onPress={() => openForm(department)}>
                            <PencilSimple size={16} aria-hidden="true" /><span className="action-label">Ubah</span>
                          </Button>
                          <Button variant="ghost" size="sm" isDisabled={busy} onPress={() => toggle(department)}
                            aria-label={`${department.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"} ${department.name}`}>
                            <Power size={16} aria-hidden="true" />
                            <span className="action-label">{department.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <nav className="list-pager" aria-label="Halaman departemen">
            <span className="list-pager-range tabular">{from}-{to} dari {total}</span>
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
        <DepartmentFormDialog open department={form.department} busy={busy} error={actionError}
          onClose={() => setForm(null)}
          onSubmit={(input) => void run(
            () => (form.department ? api.update(form.department.id, input) : api.create(input)),
            (d) => `${d.name} ${form.department ? "diperbarui" : "ditambahkan"}.`,
          )} />
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Nonaktifkan departemen?" confirmLabel="Nonaktifkan"
        busy={busy} error={actionError} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && void run(() => api.setStatus(confirm.id, "INACTIVE"), (d) => `${d.name} dinonaktifkan.`)}>
        <p className="dialog-text">
          <strong>{confirm?.name}</strong> tidak bisa dipilih untuk penugasan karyawan baru.
          Data dan riwayat tetap tersimpan, dan departemen dapat diaktifkan kembali.
        </p>
      </ConfirmDialog>
    </div>
  );
}
