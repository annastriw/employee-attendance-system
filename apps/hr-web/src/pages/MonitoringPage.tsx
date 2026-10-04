import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Drawer, Skeleton, useOverlayState } from "@heroui/react";
import {
  CaretLeft,
  CaretRight,
  Clock,
  UserCheck,
  Users,
  Warning,
  ArrowClockwise,
  ArrowSquareOut,
  X,
} from "@phosphor-icons/react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis, Notice, StatusPill, monitoringTone, CalendarField, SearchInput, FilterSelect, DateRangeField, ChartContainer, ChartLegend, ChartTooltip, type ChartSeriesConfig, dateRangePreset } from "@attendance/ui";

import { loadMasters } from "../lib/employees";
import type { MasterRecord } from "../lib/master-data";
import { AuthError, type AuthClient } from "../lib/auth-client";
import {
  monitoringDateFormatted,
  monitoringTimeFormatted,
  monitoringStatusLabel,
  type MonitoringEmployeeItem,
  type MonitoringEmployeesResult,
  type MonitoringSummary,
} from "../lib/monitoring";

type Client = Pick<AuthClient, "api">;
type Params = Record<string, string | undefined>;
interface MonitoringTrendPoint {
  date: string;
  present: number;
  late: number;
  absent: number;
  scheduleType: "REGULAR_WORKDAY" | "WEEKEND" | "HOLIDAY";
  holiday: string | null;
}
const TREND_SERIES: ChartSeriesConfig = {
  present: { label: "Hadir", color: "var(--success)" },
  late: { label: "Terlambat", color: "var(--warning)" },
  absent: { label: "Belum hadir", color: "var(--muted)" },
};
const DONUT_SERIES: ChartSeriesConfig = {
  present: { label: "Hadir tepat waktu", color: "var(--success)" },
  late: { label: "Terlambat", color: "var(--warning)" },
  absent: { label: "Belum hadir", color: "var(--muted)" },
};

const failure = (e: unknown) =>
  e instanceof Error ? e.message : "Data monitoring belum dapat dimuat. Coba lagi.";

function useFailure(onSessionExpired: () => void) {
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  }, [onSessionExpired]);
  return useCallback((e: unknown) => {
    if (e instanceof AuthError && e.status === 401) expired.current();
    return failure(e);
  }, []);
}

function getTodayWIB(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function stepDate(currentDateStr: string, deltaDays: number): string {
  const d = new Date(currentDateStr + "T12:00:00+07:00");
  d.setDate(d.getDate() + deltaDays);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

export function MonitoringPage({
  client,
  params,
  onParamsChange,
  onSessionExpired,
}: {
  client: Client;
  params: URLSearchParams;
  onParamsChange: (next: Params) => void;
  onSessionExpired: () => void;
}) {
  const handle = useFailure(onSessionExpired);

  const todayStr = getTodayWIB();
  const selectedDate = params.get("date") ?? todayStr;
  const selectedDept = params.get("departmentId") ?? "";
  const selectedStatus = params.get("status") ?? "ALL";
  const searchQuery = params.get("search") ?? "";
  const page = Math.max(1, Math.min(1000000, Number(params.get("page")) || 1));

  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [employeesData, setEmployeesData] =
    useState<MonitoringEmployeesResult | null>(null);
  const [departments, setDepartments] = useState<
    MasterRecord[]
  >([]);

  const [reload, setReload] = useState(0);
  const [summaryLoaded, setSummaryLoaded] = useState("");
  const [employeesLoaded, setEmployeesLoaded] = useState("");
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [trendRange, setTrendRange] = useState(() => dateRangePreset("7days"));
  const [trend, setTrend] = useState<MonitoringTrendPoint[]>([]);
  const [trendLoaded, setTrendLoaded] = useState("");
  const [trendError, setTrendError] = useState<{ key: string; status?: number; message: string } | null>(null);
  const [trendReload, setTrendReload] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<MonitoringEmployeeItem | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const drawerState = useOverlayState({
    isOpen: Boolean(selectedEmployee),
    onOpenChange: open => { if (!open) setSelectedEmployee(null); },
  });
  useEffect(() => {
    if (!selectedEmployee) return;
    const employeeId = selectedEmployee.employeeId;
    const rows = rowRefs.current;
    return () => rows.get(employeeId)?.focus();
  }, [selectedEmployee]);

  const summaryKey = [selectedDate, reload].join("|");
  const loadingSummary = summaryKey !== summaryLoaded;

  const employeesKey = [
    selectedDate,
    selectedDept,
    selectedStatus,
    searchQuery,
    page,
    reload,
  ].join("|");
  const loadingEmployees = employeesKey !== employeesLoaded;
  const trendKey = `${trendRange.startDate}|${trendRange.endDate}|${trendReload}`;
  const loadingTrend = trendLoaded !== trendKey;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ startDate: trendRange.startDate, endDate: trendRange.endDate });
    client.api<{ data: MonitoringTrendPoint[] }>(`monitoring/trend?${query}`)
      .then(result => { if (active) { setTrend(Array.isArray(result?.data) ? result.data : []); setTrendError(null); } })
      .catch((e: unknown) => {
        if (active) setTrendError({ key: trendKey, status: e instanceof AuthError ? e.status : undefined, message: handle(e) });
      })
      .finally(() => { if (active) setTrendLoaded(trendKey); });
    return () => { active = false; };
  }, [client, trendRange, trendKey, handle]);

  // Load departments once for dropdown
  useEffect(() => {
    let active = true;
    loadMasters(client, "departments")
      .then((records) => { if (active) setDepartments(records); })
      .catch((e: unknown) => { if (active) setError(handle(e)); });
    return () => {
      active = false;
    };
  }, [client, handle]);

  const update = useCallback(
    (next: Params) => {
      onParamsChange({
        date: selectedDate !== todayStr ? selectedDate : undefined,
        departmentId: selectedDept || undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        search: searchQuery || undefined,
        page: page > 1 ? String(page) : undefined,
        ...next,
      });
    },
    [onParamsChange, selectedDate, todayStr, selectedDept, selectedStatus, searchQuery, page],
  );

  // Fetch summary
  useEffect(() => {
    let active = true;
    client
      .api<{ data: MonitoringSummary }>(
        `monitoring/summary?date=${selectedDate}`,
      )
      .then((res) => {
        if (active) {
          setSummary(res.data);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active) setError(handle(e));
      })
      .finally(() => {
        if (active) setSummaryLoaded(summaryKey);
      });
    return () => {
      active = false;
    };
  }, [client, selectedDate, reload, summaryKey, handle]);

  // Fetch employees
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({
      date: selectedDate,
      page: String(page),
      pageSize: "20",
    });
    if (selectedDept) query.set("departmentId", selectedDept);
    if (selectedStatus && selectedStatus !== "ALL")
      query.set("status", selectedStatus);
    if (searchQuery) query.set("search", searchQuery);

    client
      .api<MonitoringEmployeesResult>(
        `monitoring/employees?${query.toString()}`,
      )
      .then((res) => {
        if (active) {
          setEmployeesData(res);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active) setError(handle(e));
      })
      .finally(() => {
        if (active) setEmployeesLoaded(employeesKey);
      });
    return () => {
      active = false;
    };
  }, [
    client,
    selectedDate,
    selectedDept,
    selectedStatus,
    searchQuery,
    page,
    reload,
    employeesKey,
    handle,
  ]);

  const handleCardClick = (cardStatus: string) => {
    if (selectedStatus === cardStatus) {
      update({ status: undefined, page: undefined });
    } else {
      update({ status: cardStatus, page: undefined });
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    onParamsChange({
      date: selectedDate !== todayStr ? selectedDate : undefined,
    });
  };

  type LegacyPayload = { items?: MonitoringEmployeeItem[]; total?: number };
  const legacyData = employeesData as LegacyPayload | null;
  const items: MonitoringEmployeeItem[] = Array.isArray(employeesData?.data)
    ? employeesData.data
    : Array.isArray(legacyData?.items)
      ? legacyData.items
      : [];
  const total = employeesData?.meta?.total ?? legacyData?.total ?? items.length;
  const isFiltered =
    selectedDept || selectedStatus !== "ALL" || searchQuery || page > 1;

  return (
    <div className="monitoring-page">
      {/* Date Navigation & Calendar Type Banner */}
      <div className="monitoring-date-header">
        <div className="monitoring-date-picker-wrap">
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Hari sebelumnya"
            className="monitoring-nav-btn"
            onPress={() => update({ date: stepDate(selectedDate, -1), page: undefined })}
          >
            <CaretLeft size={18} />
          </Button>
          <CalendarField label="Pilih tanggal monitoring" value={selectedDate} onChange={value => { if (value) update({ date: value, page: undefined }); }} />
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Hari berikutnya"
            className="monitoring-nav-btn"
            onPress={() => update({ date: stepDate(selectedDate, 1), page: undefined })}
          >
            <CaretRight size={18} />
          </Button>
          {selectedDate !== todayStr && (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => update({ date: undefined, page: undefined })}
            >
              Hari Ini
            </Button>
          )}
        </div>
        <div className="monitoring-date-info">
          <span className="monitoring-display-date">
            {monitoringDateFormatted(selectedDate)}
          </span>
          {summary && (
            <StatusPill
              tone={summary.isWorkday ? "active" : "inactive"}
              label={
                summary.scheduleType === "REGULAR_WORKDAY"
                  ? "Hari Kerja Reguler"
                  : summary.scheduleType === "HOLIDAY"
                    ? "Hari Libur Nasional"
                    : "Akhir Pekan"
              }
            />
          )}
        </div>
      </div>

      {error && (
        <div className="load-error">
          <Notice message={error} />
          <Button
            variant="secondary"
            onPress={() => setReload((r) => r + 1)}
          >
            <ArrowClockwise size={16} />
            Muat ulang
          </Button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="monitoring-summary-grid">
        <div
          className={`monitoring-metric-card ${
            selectedStatus === "ALL" ? "is-active" : ""
          }`}
          onClick={() => update({ status: undefined, page: undefined })}
          role="button"
          tabIndex={0}
          aria-label="Total Karyawan Aktif"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              update({ status: undefined, page: undefined });
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon">
              <Users size={20} />
            </span>
            <span className="metric-title">Karyawan Aktif</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.activeEmployees ?? 0
            )}
          </div>
          <div className="metric-desc">Wajib absensi pada tanggal ini</div>
        </div>

        <div
          className={`monitoring-metric-card ${
            selectedStatus === "CHECKED_IN" ? "is-active" : ""
          }`}
          onClick={() => handleCardClick("CHECKED_IN")}
          role="button"
          tabIndex={0}
          aria-label="Total Hadir / Check-in"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCardClick("CHECKED_IN");
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon metric-icon-success">
              <UserCheck size={20} />
            </span>
            <span className="metric-title">Hadir / Check-in</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.checkedIn ?? 0
            )}
          </div>
          <div className="metric-desc">Sudah mencatat kehadiran</div>
        </div>

        <div
          className={`monitoring-metric-card ${
            selectedStatus === "LATE" ? "is-active" : ""
          }`}
          onClick={() => handleCardClick("LATE")}
          role="button"
          tabIndex={0}
          aria-label="Total Terlambat"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCardClick("LATE");
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon metric-icon-warning">
              <Warning size={20} />
            </span>
            <span className="metric-title">Terlambat</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.late ?? 0
            )}
          </div>
          <div className="metric-desc">Check-in setelah 08:00 WIB</div>
        </div>

        <div
          className={`monitoring-metric-card ${
            selectedStatus === "EARLY_DEPARTURE" ? "is-active" : ""
          }`}
          onClick={() => handleCardClick("EARLY_DEPARTURE")}
          role="button"
          tabIndex={0}
          aria-label="Total Pulang Lebih Awal"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCardClick("EARLY_DEPARTURE");
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon metric-icon-warning">
              <Clock size={20} />
            </span>
            <span className="metric-title">Pulang Awal</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.earlyDeparture ?? 0
            )}
          </div>
          <div className="metric-desc">Checkout sebelum 17:00 WIB</div>
        </div>

        <div
          className={`monitoring-metric-card ${
            selectedStatus === "PENDING_CHECKOUT" ? "is-active" : ""
          }`}
          onClick={() => handleCardClick("PENDING_CHECKOUT")}
          role="button"
          tabIndex={0}
          aria-label="Total Belum Checkout"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCardClick("PENDING_CHECKOUT");
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon metric-icon-info">
              <Clock size={20} />
            </span>
            <span className="metric-title">Belum Checkout</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.pendingCheckout ?? 0
            )}
          </div>
          <div className="metric-desc">Check-in tanpa checkout</div>
        </div>

        <div
          className={`monitoring-metric-card ${
            selectedStatus === "MISSING" ? "is-active" : ""
          }`}
          onClick={() => handleCardClick("MISSING")}
          role="button"
          tabIndex={0}
          aria-label="Total Tidak Ada Absensi"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCardClick("MISSING");
            }
          }}
        >
          <div className="metric-header">
            <span className="metric-icon metric-icon-danger">
              <Warning size={20} />
            </span>
            <span className="metric-title">Tidak Ada Absensi</span>
          </div>
          <div className="metric-value">
            {loadingSummary ? (
              <Skeleton className="skeleton-metric" />
            ) : (
              summary?.missingAttendance ?? 0
            )}
          </div>
          <div className="metric-desc">Hari kerja tanpa absensi</div>
        </div>
      </div>

      <section className="monitoring-analytics-grid" aria-label="Analitik kehadiran">
        <article className="monitoring-chart-card monitoring-trend-card">
          <header className="monitoring-chart-heading">
            <div><h2>Tren kehadiran</h2><p>Jumlah karyawan per hari</p></div>
            <DateRangeField label="Rentang tren" value={trendRange} onChange={value => { if (value) setTrendRange(value); }} />
          </header>
          {loadingTrend ? <Skeleton className="monitoring-chart-loading" aria-label="Memuat tren kehadiran" /> : trendError?.key === trendKey ? (
            <div className="monitoring-chart-message" role="status">
              <p>{trendError.status === 404 ? "Grafik tren tersedia setelah rilis backend" : trendError.message}</p>
              {trendError.status !== 404 && <Button size="sm" variant="secondary" onPress={() => setTrendReload(x => x + 1)}>Coba lagi</Button>}
            </div>
          ) : trend.length ? <>
            <ChartContainer label="Grafik tren harian: hadir, terlambat, belum hadir" height={250}>
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`))} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltip series={TREND_SERIES} />} />
                <Area type="monotone" dataKey="present" stroke="var(--success)" fill="var(--success)" fillOpacity={0.14} />
                <Area type="monotone" dataKey="late" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.12} />
                <Area type="monotone" dataKey="absent" stroke="var(--muted)" fill="var(--muted)" fillOpacity={0.1} />
              </AreaChart>
            </ChartContainer>
            <ChartLegend series={TREND_SERIES} />
          </> : <p className="monitoring-chart-message">Belum ada data tren pada rentang ini.</p>}
        </article>
        <article className="monitoring-chart-card monitoring-donut-card">
          <header className="monitoring-chart-heading"><div><h2>Komposisi {monitoringDateFormatted(selectedDate)}</h2><p>Ringkasan untuk tanggal terpilih</p></div></header>
          {loadingSummary ? <Skeleton className="monitoring-chart-loading" aria-label="Memuat komposisi kehadiran" /> : summary && summary.activeEmployees > 0 ? <div className="monitoring-donut-wrap">
            <ChartContainer label="Komposisi hadir tepat waktu, terlambat, dan belum hadir hari ini" height={220}>
              <PieChart><Pie data={[
                { key: "present", value: Math.max(summary.checkedIn - summary.late, 0) },
                { key: "late", value: summary.late },
                { key: "absent", value: summary.missingAttendance },
              ]} dataKey="value" nameKey="key" innerRadius="66%" outerRadius="88%" paddingAngle={2} stroke="none">
                {Object.keys(DONUT_SERIES).map(key => <Cell key={key} fill={DONUT_SERIES[key].color} />)}
              </Pie><Tooltip content={<ChartTooltip series={DONUT_SERIES} />} /></PieChart>
            </ChartContainer>
            <div className="monitoring-donut-center"><strong>{summary.activeEmployees}</strong><span>Karyawan</span></div>
          </div> : <p className="monitoring-chart-message">Belum ada data untuk tanggal ini.</p>}
          <ChartLegend series={DONUT_SERIES} />
        </article>
      </section>

      {/* Filter Toolbar */}
      <div className="monitoring-filters-toolbar">
        <SearchInput label="Cari nama atau NIK" value={searchInput} onChange={setSearchInput} onSearch={value => update({ search: value.trim() || undefined, page: undefined })} placeholder="Cari nama atau NIK" />

        <div className="monitoring-selectors">
          <FilterSelect label="Filter Departemen" value={selectedDept}
            onChange={value => update({ departmentId: value || undefined, page: undefined })}
            options={[{ id: "", name: "Semua departemen" }, ...departments.map(d => ({ id: d.id, name: d.name + (d.status === "INACTIVE" ? " (Nonaktif)" : "") }))]} />

          <FilterSelect label="Filter Status Kehadiran" value={selectedStatus}
            onChange={value => update({ status: value === "ALL" ? undefined : value, page: undefined })}
            options={[{ id: "ALL", name: "Semua Status" }, { id: "CHECKED_IN", name: "Hadir" }, { id: "LATE", name: "Terlambat" }, { id: "EARLY_DEPARTURE", name: "Pulang Lebih Awal" }, { id: "PENDING_CHECKOUT", name: "Belum Checkout" }, { id: "COMPLETED", name: "Selesai" }, { id: "MISSING", name: "Tidak Ada Absensi" }, { id: "PENDING_CHECK_IN", name: "Belum Check-in" }, { id: "DELETED", name: "Dihapus HRD" }]} />

          {isFiltered && (
            <Button
              variant="ghost"
              className="monitoring-reset-btn"
              onPress={handleClearFilters}
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Employees Attendance Table */}
      {loadingEmployees ? (
        <div
          className="table-skeleton"
          aria-busy="true"
          aria-label="Memuat daftar absensi"
        >
          {[0, 1, 2, 3, 4].map((r) => (
            <Skeleton key={r} className="skeleton-row" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Clock size={22} />
          </span>
          <p className="empty-title">Tidak ada data absensi</p>
          <p className="empty-body">
            {isFiltered
              ? "Tidak ada data karyawan yang cocok dengan kriteria filter."
              : "Belum ada catatan kehadiran pada tanggal ini."}
          </p>
          {isFiltered && (
            <Button variant="secondary" onPress={handleClearFilters}>
              Hapus Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="portal-table" aria-label="Tabel monitoring kehadiran">
            <thead>
              <tr>
                <th scope="col">Karyawan</th>
                <th scope="col">Departemen &amp; Jabatan</th>
                <th scope="col">Check-in</th>
                <th scope="col">Checkout</th>
                <th scope="col">Status Kehadiran</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: MonitoringEmployeeItem) => (
                <tr key={item.employeeId} ref={node => { if (node) rowRefs.current.set(item.employeeId, node); else rowRefs.current.delete(item.employeeId); }} data-interactive-row="true" tabIndex={0}
                  aria-label={`Buka detail ${item.name}`}
                  onClick={event => {
                    if (event.target instanceof Element && event.target.closest("a, button")) return;
                    setSelectedEmployee(item);
                  }}
                  onKeyDown={event => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setSelectedEmployee(item);
                    }
                  }}>
                  <td data-label="Karyawan">
                    <div className="table-cell-title">{item.name}</div>
                    <div className="table-cell-subtitle">{item.nik}</div>
                  </td>
                  <td data-label="Departemen & Jabatan">
                    <div>{item.department}</div>
                    <div className="table-cell-subtitle">{item.position}</div>
                  </td>
                  <td data-label="Check-in">
                    <div className="time-badge-wrap">
                      <span>{monitoringTimeFormatted(item.checkInTime)}</span>
                      {item.isLate && (
                        <span className="badge badge-warning">Terlambat</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Checkout">
                    <div className="time-badge-wrap">
                      <span>{monitoringTimeFormatted(item.checkOutTime)}</span>
                      {item.isEarlyDeparture && (
                        <span className="badge badge-warning">Pulang Awal</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Status Kehadiran">
                    <StatusPill
                      tone={monitoringTone(item.status)}
                      label={monitoringStatusLabel(item.status)}
                    />
                  </td>
                  <td data-label="Aksi">
                    {item.recordId ? (
                      <Link
                        to={`/absensi?id=${item.recordId}`}
                        className="btn-action-link"
                        aria-label={`Lihat detail absensi ${item.name}`}
                      >
                        <ArrowSquareOut size={16} />
                        Lihat
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="table-pager" aria-label="Navigasi halaman">
          <Button
            variant="ghost"
            isIconOnly
            isDisabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="pager-btn"
            onPress={() => update({ page: String(page - 1) })}
          >
            <CaretLeft size={16} />
          </Button>
          <span className="pager-text">
            Halaman {page} dari {Math.max(1, Math.ceil(total / 20))} ({total} karyawan)
          </span>
          <Button
            variant="ghost"
            isIconOnly
            isDisabled={page >= Math.ceil(total / 20)}
            aria-label="Halaman berikutnya"
            className="pager-btn"
            onPress={() => update({ page: String(page + 1) })}
          >
            <CaretRight size={16} />
          </Button>
        </div>
      )}

      <Drawer state={drawerState}>
        <Drawer.Trigger className="monitoring-detail-trigger" aria-hidden="true">Open employee detail</Drawer.Trigger>
        <Drawer.Backdrop className="monitoring-detail-backdrop">
          <Drawer.Content className="monitoring-detail-drawer" placement="right">
            <Drawer.Dialog aria-label={selectedEmployee ? `Detail ${selectedEmployee.name}` : "Detail karyawan"}>
              <Drawer.Header className="monitoring-detail-header">
                <div><h2>{selectedEmployee?.name ?? "Detail karyawan"}</h2><p>{selectedEmployee?.nik}</p></div>
                <Drawer.CloseTrigger aria-label="Tutup detail"><X size={18} /></Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body className="monitoring-detail-body">
                <StatusPill tone={monitoringTone(selectedEmployee?.status ?? "MISSING")} label={selectedEmployee ? monitoringStatusLabel(selectedEmployee.status) : ""} />
                <dl><div><dt>Tanggal</dt><dd>{selectedEmployee ? monitoringDateFormatted(selectedEmployee.attendanceDate) : "—"}</dd></div>
                  <div><dt>Departemen</dt><dd>{selectedEmployee?.department ?? "—"}</dd></div><div><dt>Jabatan</dt><dd>{selectedEmployee?.position ?? "—"}</dd></div>
                  <div><dt>Check-in</dt><dd>{monitoringTimeFormatted(selectedEmployee?.checkInTime ?? null)}</dd></div><div><dt>Checkout</dt><dd>{monitoringTimeFormatted(selectedEmployee?.checkOutTime ?? null)}</dd></div>
                </dl>
              </Drawer.Body>
              <Drawer.Footer className="monitoring-detail-footer">
                {selectedEmployee?.recordId ? <Link to={`/absensi?id=${encodeURIComponent(selectedEmployee.recordId)}`} className="monitoring-detail-link">Buka detail absensi <ArrowSquareOut size={16} /></Link> : <Link to={`/karyawan?employee=${encodeURIComponent(selectedEmployee?.employeeId ?? "")}`} className="monitoring-detail-link is-secondary">Buka profil karyawan</Link>}
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
