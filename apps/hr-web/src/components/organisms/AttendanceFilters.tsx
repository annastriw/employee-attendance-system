import { useEffect, useState, type SubmitEvent } from "react";
import { Button, Input, Label, SearchField } from "@heroui/react";
import { Notice } from "@attendance/ui";
import type { AuthClient } from "../../lib/auth-client";
type Client = Pick<AuthClient, "api">;
type Params = Record<string, string | undefined>;
export function AttendanceFilters({
  client,
  params,
  apply,
  handle,
}: {
  client: Client;
  params: URLSearchParams;
  apply: (params: Params) => void;
  handle: (e: unknown) => string;
}) {
  const [query, setQuery] = useState("");
  const [employeeId, setEmployeeId] = useState(params.get("employeeId") ?? "");
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setOptions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      client
        .api<{ items: { id: string; name: string }[] }>(
          "employees?status=ALL&pageSize=20&search=" +
            encodeURIComponent(query.trim()),
        )
        .then((result) => {
          if (active) {
            setOptions(result.items);
            setError("");
          }
        })
        .catch((e: unknown) => {
          if (active) setError(handle(e));
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, query, handle]);
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const startDate = String(fields.get("startDate") ?? "");
    const endDate = String(fields.get("endDate") ?? "");
    if (startDate && endDate && startDate > endDate) {
      setError("Tanggal awal harus sebelum atau sama dengan tanggal akhir.");
      return;
    }
    setError("");
    apply({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      employeeId: employeeId || undefined,
      page: undefined,
      id: undefined,
    });
  }
  return (
    <div>
      <form className="attendance-filters" onSubmit={submit}>
        <div>
          <Label htmlFor="attendance-from">Dari tanggal</Label>
          <Input
            id="attendance-from"
            type="date"
            name="startDate"
            defaultValue={params.get("startDate") ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="attendance-until">Sampai tanggal</Label>
          <Input
            id="attendance-until"
            type="date"
            name="endDate"
            defaultValue={params.get("endDate") ?? ""}
          />
        </div>
        <div className="attendance-employee-filter">
          <Label htmlFor="attendance-employee">Karyawan</Label>
          <SearchField
            aria-label="Cari karyawan untuk filter"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setOptions([]);
            }}
          >
            <SearchField.Input placeholder="Cari nama atau NIK…" />
            <SearchField.ClearButton />
          </SearchField>
          <select
            id="attendance-employee"
            className="attendance-select"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Semua karyawan</option>
            {employeeId && !options.some((e) => e.id === employeeId) && (
              <option value={employeeId}>Karyawan terpilih</option>
            )}
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {query.trim().length >= 2 && (
            <span className="employee-secondary" role="status">
              {searching
                ? "Mencari…"
                : options.length
                  ? "Pilih hasil pencarian."
                  : "Tidak ada hasil pencarian."}
            </span>
          )}
        </div>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
      </form>
      {error && <Notice message={error} />}
    </div>
  );
}
