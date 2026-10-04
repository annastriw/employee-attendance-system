import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Skeleton } from "@heroui/react";
import {
  CaretLeft,
  CaretRight,
  Clock,
  UserCheck,
  Users,
  Warning,
  ArrowClockwise,
  CalendarBlank,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { Notice, StatusPill, monitoringTone } from "@attendance/ui";

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
    { id: string; name: string }[]
  >([]);

  const [reload, setReload] = useState(0);
  const [summaryLoaded, setSummaryLoaded] = useState("");
  const [employeesLoaded, setEmployeesLoaded] = useState("");
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(searchQuery);

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

  // Load departments once for dropdown
  useEffect(() => {
    let active = true;
    client
      .api<{ items: { id: string; name: string }[] }>(
        "departments?status=ALL&pageSize=100",
      )
      .then((res) => {
        if (active) setDepartments(res.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ search: searchInput.trim() || undefined, page: undefined });
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
          <div className="monitoring-date-field">
            <CalendarBlank size={18} className="monitoring-date-icon" />
            <input
              id="monitoring-date"
              type="date"
              aria-label="Pilih tanggal monitoring"
              className="monitoring-date-input"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  update({ date: e.target.value, page: undefined });
                }
              }}
            />
          </div>
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

      {/* Filter Toolbar */}
      <div className="monitoring-filters-toolbar">
        <form
          className="monitoring-search-form"
          onSubmit={handleSearchSubmit}
        >
          <Input
            id="monitoring-search-input"
            aria-label="Cari nama atau NIK"
            placeholder="Cari nama atau NIK..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Cari
          </Button>
        </form>

        <div className="monitoring-selectors">
          <div className="monitoring-select-wrap">
            <label htmlFor="dept-filter" className="field-label">
              Departemen
            </label>
            <select
              id="dept-filter"
              aria-label="Filter Departemen"
              className="monitoring-dropdown"
              value={selectedDept}
              onChange={(e) =>
                update({ departmentId: e.target.value || undefined, page: undefined })
              }
            >
              <option value="">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="monitoring-select-wrap">
            <label htmlFor="status-filter" className="field-label">
              Status Kehadiran
            </label>
            <select
              id="status-filter"
              aria-label="Filter Status Kehadiran"
              className="monitoring-dropdown"
              value={selectedStatus}
              onChange={(e) =>
                update({
                  status: e.target.value !== "ALL" ? e.target.value : undefined,
                  page: undefined,
                })
              }
            >
              <option value="ALL">Semua Status</option>
              <option value="CHECKED_IN">Hadir</option>
              <option value="LATE">Terlambat</option>
              <option value="EARLY_DEPARTURE">Pulang Lebih Awal</option>
              <option value="PENDING_CHECKOUT">Belum Checkout</option>
              <option value="COMPLETED">Selesai</option>
              <option value="MISSING">Tidak Ada Absensi</option>
              <option value="PENDING_CHECK_IN">Belum Check-in</option>
              <option value="DELETED">Dihapus HRD</option>
            </select>
          </div>

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
                <tr key={item.employeeId}>
                  <td>
                    <div className="table-cell-title">{item.name}</div>
                    <div className="table-cell-subtitle">{item.nik}</div>
                  </td>
                  <td>
                    <div>{item.department}</div>
                    <div className="table-cell-subtitle">{item.position}</div>
                  </td>
                  <td>
                    <div className="time-badge-wrap">
                      <span>{monitoringTimeFormatted(item.checkInTime)}</span>
                      {item.isLate && (
                        <span className="badge badge-warning">Terlambat</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="time-badge-wrap">
                      <span>{monitoringTimeFormatted(item.checkOutTime)}</span>
                      {item.isEarlyDeparture && (
                        <span className="badge badge-warning">Pulang Awal</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <StatusPill
                      tone={monitoringTone(item.status)}
                      label={monitoringStatusLabel(item.status)}
                    />
                  </td>
                  <td>
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
    </div>
  );
}
