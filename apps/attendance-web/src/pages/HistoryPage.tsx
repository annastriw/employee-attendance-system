import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Button, Input, Label, Skeleton } from "@heroui/react";
import { ArrowLeft, CaretLeft, CaretRight, Clock } from "@phosphor-icons/react";
import { AuthShell, Notice } from "@attendance/ui";

import { HistoryEvidence } from "../components/organisms/HistoryEvidence";
import { AuthError, type AuthClient } from "../lib/auth-client";
import { clockLabel } from "../lib/attendance-client";
import {
  getHistory,
  getHistoryDetail,
  historyDate,
  historyStatus,
  type HistoryRecord,
  type HistoryResult,
  type HistoryParams,
} from "../lib/attendance-history";
import "../styles/history-page.css";
export default function HistoryPage({
  client,
  params,
  onParamsChange,
  onHome,
  onSessionExpired,
}: {
  client: AuthClient;
  params: URLSearchParams;
  onParamsChange: (next: HistoryParams) => void;
  onHome: () => void;
  onSessionExpired: () => void;
}) {
  const id = params.get("id"),
    startDate = params.get("startDate") ?? "",
    endDate = params.get("endDate") ?? "",
    page = params.get("page") ?? "1";
  const [data, setData] = useState<HistoryResult | HistoryRecord | null>(null);
  const [error, setError] = useState(""),
    [filterError, setFilterError] = useState(""),
    [loaded, setLoaded] = useState(""),
    [reload, setReload] = useState(0);
  const key = [id, startDate, endDate, page, reload].join("|");
  const loading = key !== loaded;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, [id]);
  useEffect(() => {
    const c = new AbortController();
    const query = new URLSearchParams({ page });
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    void (
      id
        ? getHistoryDetail(client, id, c.signal)
        : getHistory(client, query, c.signal)
    )
      .then((result) => {
        if (!c.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        if (e instanceof AuthError && e.status === 401) onSessionExpired();
        setError(
          e instanceof Error ? e.message : "Riwayat belum dapat dimuat.",
        );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoaded(key);
      });
    return () => c.abort();
  }, [client, id, startDate, endDate, page, key, reload, onSessionExpired]);
  function update(next: HistoryParams) {
    onParamsChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: page === "1" ? undefined : page,
      id: undefined,
      ...next,
    });
  }
  function filter(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const start = String(fields.get("startDate") ?? ""),
      end = String(fields.get("endDate") ?? "");
    if (start && end && start > end) {
      setFilterError(
        "Tanggal awal harus sebelum atau sama dengan tanggal akhir.",
      );
      return;
    }
    setFilterError("");
    update({
      startDate: start || undefined,
      endDate: end || undefined,
      page: undefined,
      id: undefined,
    });
  }
  const detail = id && data && !("data" in data) ? data : null;
  const list = !id && data && "data" in data ? data : null;
  const refresh = () => setReload((r) => r + 1);
  return (
    <AuthShell
      name="Attendance Portal"
      brandIcon={<Clock size={16} weight="bold" />}
    >
      <div className="history-page">
        <Button
          variant="ghost"
          className="history-back"
          onPress={id ? () => update({ id: undefined }) : onHome}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {id ? "Kembali ke riwayat" : "Hari ini"}
        </Button>
        <h1 tabIndex={-1} ref={title}>
          {id ? "Detail absensi" : "Riwayat"}
        </h1>
        {!id && (
          <form
            key={startDate + "|" + endDate}
            className="history-filter"
            onSubmit={filter}
          >
            <div>
              <Label htmlFor="history-from">Dari tanggal</Label>
              <Input
                id="history-from"
                name="startDate"
                type="date"
                defaultValue={startDate}
              />
            </div>
            <div>
              <Label htmlFor="history-until">Sampai tanggal</Label>
              <Input
                id="history-until"
                name="endDate"
                type="date"
                defaultValue={endDate}
              />
            </div>
            <Button type="submit" variant="secondary">
              Terapkan
            </Button>
            {(startDate || endDate || page !== "1") && (
              <Button
                variant="ghost"
                onPress={() => {
                  setFilterError("");
                  onParamsChange({});
                }}
              >
                Bersihkan filter
              </Button>
            )}
          </form>
        )}
        {filterError && <Notice message={filterError} />}
        {loading ? (
          <div
            aria-busy="true"
            aria-label="Memuat riwayat"
            className="history-skeleton"
          >
            {[0, 1, 2].map((r) => (
              <Skeleton key={r} className="history-skeleton-row" />
            ))}
          </div>
        ) : error ? (
          <div>
            <Notice message={error} />
            <Button variant="secondary" onPress={refresh}>
              Muat ulang
            </Button>
          </div>
        ) : detail ? (
          <>
            <div className="history-detail-heading">
              <p>{historyDate(detail.attendanceDate)}</p>
              <span className="history-status">{historyStatus(detail)}</span>
            </div>
            <p className="history-muted">
              {detail.department} · {detail.position}
            </p>
            {detail.deletedAt && (
              <section
                className="history-deleted"
                aria-label="Penghapusan oleh HRD"
              >
                <p className="history-muted">
                  Dihapus pada {historyDate(detail.deletedAt)}{" "}
                  {clockLabel(detail.deletedAt)} WIB
                </p>
                <p className="history-reason">{detail.deleteReason}</p>
              </section>
            )}
            <HistoryEvidence
              key={detail.id + "-in-" + reload}
              client={client}
              recordId={detail.id}
              event={detail.checkIn}
              label="check-in"
              date={detail.attendanceDate}
              deleted={!!detail.deletedAt}
              onSessionExpired={onSessionExpired}
              onReload={refresh}
            />
            <HistoryEvidence
              key={detail.id + "-out-" + reload}
              client={client}
              recordId={detail.id}
              event={detail.checkOut}
              label="checkout"
              date={detail.attendanceDate}
              deleted={!!detail.deletedAt}
              onSessionExpired={onSessionExpired}
              onReload={refresh}
            />
            <Button variant="ghost" onPress={refresh}>
              Muat ulang
            </Button>
          </>
        ) : (
          list &&
          (!list.data.length ? (
            <div className="history-empty">
              <h2>Belum ada riwayat</h2>
              <p className="history-muted">
                Tidak ada catatan dalam periode ini.
              </p>
            </div>
          ) : (
            <>
              <ul className="history-list">
                {list.data.map((row) => (
                  <li key={row.id} className="history-card">
                    <Button
                      variant="ghost"
                      className="history-date-button"
                      aria-label={
                        "Buka absensi " + historyDate(row.attendanceDate)
                      }
                      onPress={() => update({ id: row.id })}
                    >
                      {historyDate(row.attendanceDate)}
                    </Button>
                    <span className="history-status">{historyStatus(row)}</span>
                    <dl className="history-times">
                      <div>
                        <dt>Check-in</dt>
                        <dd>{clockLabel(row.checkIn.eventTime)}</dd>
                      </div>
                      <div>
                        <dt>Checkout</dt>
                        <dd>
                          {row.checkOut
                            ? clockLabel(row.checkOut.eventTime)
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                    <p className="history-muted">
                      {row.department} · {row.position}
                    </p>
                  </li>
                ))}
              </ul>
              <nav className="history-pager" aria-label="Halaman riwayat">
                <span>
                  {(list.meta.page - 1) * list.meta.pageSize + 1}–
                  {Math.min(
                    list.meta.page * list.meta.pageSize,
                    list.meta.total,
                  )}{" "}
                  dari {list.meta.total}
                </span>
                <div>
                  <Button
                    variant="secondary"
                    isIconOnly
                    aria-label="Halaman sebelumnya"
                    isDisabled={list.meta.page <= 1}
                    onPress={() =>
                      update({
                        page:
                          list.meta.page > 2
                            ? String(list.meta.page - 1)
                            : undefined,
                      })
                    }
                  >
                    <CaretLeft size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    isIconOnly
                    aria-label="Halaman berikutnya"
                    isDisabled={
                      list.meta.page * list.meta.pageSize >= list.meta.total
                    }
                    onPress={() => update({ page: String(list.meta.page + 1) })}
                  >
                    <CaretRight size={16} />
                  </Button>
                </div>
              </nav>
            </>
          ))
        )}
      </div>
    </AuthShell>
  );
}
