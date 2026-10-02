import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Skeleton, Table } from "@heroui/react";
import { CaretLeft, CaretRight, Clock } from "@phosphor-icons/react";
import { Notice } from "../components/molecules/Notice";
import { AttendanceFilters } from "../components/organisms/AttendanceFilters";
import { AttendanceDetailPage } from "./AttendanceDetailPage";
import { AuthError, type AuthClient } from "../lib/auth-client";
import {
  attendanceDate,
  attendanceTime,
  attendanceStatus,
  type AttendancePageResult,
} from "../lib/attendance";
type Client = Pick<AuthClient, "api">;
type Params = Record<string, string | undefined>;
const failure = (e: unknown) =>
  e instanceof Error ? e.message : "Data belum dapat dimuat. Coba lagi.";
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
export function AttendancePage({
  client,
  params,
  deleted,
  onParamsChange,
  onSessionExpired,
}: {
  client: Client;
  params: URLSearchParams;
  deleted: boolean;
  onParamsChange: (next: Params) => void;
  onSessionExpired: () => void;
}) {
  const handle = useFailure(onSessionExpired);
  const id = params.get("id");
  const startDate = params.get("startDate") ?? "",
    endDate = params.get("endDate") ?? "",
    employeeId = params.get("employeeId") ?? "";
  const page = Math.max(1, Math.min(1000000, Number(params.get("page")) || 1));
  const [data, setData] = useState<AttendancePageResult | null>(null);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState("");
  const [error, setError] = useState("");
  const key = [deleted, startDate, endDate, employeeId, page, reload].join("|");
  const loading = key !== loaded;
  function update(next: Params) {
    onParamsChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      employeeId: employeeId || undefined,
      page: page > 1 ? String(page) : undefined,
      id: undefined,
      ...next,
    });
  }
  useEffect(() => {
    if (id) return;
    let active = true;
    const query = new URLSearchParams({
      status: deleted ? "DELETED" : "ACTIVE",
      page: String(page),
      pageSize: "20",
    });
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    if (employeeId) query.set("employeeId", employeeId);
    client
      .api<AttendancePageResult>("attendance?" + query.toString())
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active) setError(handle(e));
      })
      .finally(() => {
        if (active) setLoaded(key);
      });
    return () => {
      active = false;
    };
  }, [
    client,
    id,
    deleted,
    startDate,
    endDate,
    employeeId,
    page,
    reload,
    key,
    handle,
  ]);
  if (id)
    return (
      <AttendanceDetailPage
        key={id}
        client={client}
        id={id}
        onBack={() => update({ id: undefined })}
        handle={handle}
      />
    );
  const total = data?.meta.total ?? 0;
  return (
    <div className="attendance-page">
      <AttendanceFilters
        key={[startDate, endDate, employeeId].join("|")}
        client={client}
        params={params}
        apply={update}
        handle={handle}
      />
      {loading ? (
        <div
          className="table-skeleton"
          aria-busy="true"
          aria-label="Memuat absensi"
        >
          {[0, 1, 2].map((r) => (
            <Skeleton key={r} className="skeleton-row" />
          ))}
        </div>
      ) : error ? (
        <div className="load-error">
          <Notice message={error} />
          <Button variant="secondary" onPress={() => setReload((r) => r + 1)}>
            Muat ulang
          </Button>
        </div>
      ) : !data?.data.length ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Clock size={22} />
          </span>
          <p className="empty-title">
            {deleted ? "Tidak ada absensi dihapus" : "Tidak ada absensi"}
          </p>
          <p className="empty-body">Belum ada catatan dalam pilihan ini.</p>
          {(startDate || endDate || employeeId || page > 1) && (
            <Button variant="secondary" onPress={() => onParamsChange({})}>
              Bersihkan filter
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table className="data-table attendance-table">
            <Table.ScrollContainer>
              <Table.Content
                className="attendance-table-content"
                aria-label={deleted ? "Absensi dihapus" : "Daftar absensi"}
              >
                <Table.Header>
                  <Table.Column isRowHeader>Karyawan</Table.Column>
                  <Table.Column>Waktu · WIB</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {data.data.map((row) => (
                    <Table.Row id={row.id} key={row.id}>
                      <Table.Cell>
                        <Button
                          variant="tertiary"
                          className="cell-strong employee-name"
                          aria-label={
                            "Buka absensi " +
                            row.employee.name +
                            " " +
                            attendanceDate(row.attendanceDate)
                          }
                          onPress={() => update({ id: row.id })}
                        >
                          {row.employee.name}
                        </Button>
                        <span className="employee-secondary">
                          {attendanceDate(row.attendanceDate)}
                        </span>
                        <span className="employee-secondary">
                          {row.department}
                          {row.employee.status === "ARCHIVED" ? " · Arsip" : ""}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="tabular">
                          {attendanceTime(row.checkIn?.eventTime)} —{" "}
                          {attendanceTime(row.checkOut?.eventTime)}
                        </span>
                        {row.checkIn?.isLate && (
                          <span className="employee-secondary">Terlambat</span>
                        )}
                        {row.checkOut?.isEarlyDeparture && (
                          <span className="employee-secondary">
                            Pulang awal
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="status-badge status-inactive">
                          {attendanceStatus(row)}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <nav className="list-pager" aria-label="Halaman absensi">
            <span className="list-pager-range">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} dari {total}
            </span>
            <div className="list-pager-buttons">
              <Button
                variant="secondary"
                isIconOnly
                aria-label="Halaman sebelumnya"
                isDisabled={page <= 1}
                onPress={() =>
                  update({ page: page > 2 ? String(page - 1) : undefined })
                }
              >
                <CaretLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                isIconOnly
                aria-label="Halaman berikutnya"
                isDisabled={page * 20 >= total}
                onPress={() => update({ page: String(page + 1) })}
              >
                <CaretRight size={16} />
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
