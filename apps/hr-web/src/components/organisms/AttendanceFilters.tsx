import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { DateRangeField, FilterSelect, Notice, SearchInput, listDateRange, rangeQuery } from "@attendance/ui";
import type { AuthClient } from "../../lib/auth-client";
type Params = Record<string, string | undefined>;
export function AttendanceFilters({ client, params, apply, handle }: {
  client: Pick<AuthClient, "api">; params: URLSearchParams;
  apply: (params: Params) => void; handle: (e: unknown) => string;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const employeeId = params.get("employeeId") ?? "";
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let active = true;
    client.api<{ items: { id: string; name: string }[] }>("employees?pageSize=20" + (search ? "&search=" + encodeURIComponent(search) : ""))
      .then(result => { if (active) { setOptions(result.items); setError(""); } })
      .catch((e: unknown) => { if (active) setError(handle(e)); })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [client, search, handle]);
  return <div>
    <div className="attendance-filters">
      <DateRangeField value={listDateRange(params)} onChange={value => apply(rangeQuery(value))} />
      <Button size="sm" variant="ghost" onPress={() => apply(rangeQuery(null))}>Semua tanggal</Button>
      <div className="attendance-employee-filter">
        <SearchInput label="Cari karyawan untuk filter" value={query}
          onChange={value => { setQuery(value); setSearching(true); }} onSearch={value => setSearch(value.trim())}
          placeholder="Cari nama atau NIK" />
        <FilterSelect label="Karyawan" value={employeeId}
          onChange={value => apply({ employeeId: value || undefined, page: undefined, id: undefined })}
          options={[{ id: "", name: "Semua karyawan" }, ...(employeeId && !options.some(e => e.id === employeeId) ? [{ id: employeeId, name: "Karyawan terpilih" }] : []), ...options]} />
        {query && <span className="employee-secondary" role="status">{searching ? "Mencari\u2026" : options.length ? "Pilih hasil pencarian." : "Tidak ada hasil pencarian."}</span>}
      </div>
    </div>
    {error && <Notice message={error} />}
  </div>;
}
