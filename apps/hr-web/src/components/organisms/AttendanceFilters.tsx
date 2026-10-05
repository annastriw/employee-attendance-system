import { useEffect, useState } from "react";

import { DateRangeField, FilterSelect, FilterPanel, Notice, listDateRange, rangeQuery } from "@attendance/ui";
import type { AuthClient } from "../../lib/auth-client";
import { loadMasters } from "../../lib/employees";
type Params = Record<string, string | undefined>;
type Option = { id: string; name: string };
export function AttendanceFilters({ client, params, apply, handle }: {
  client: Pick<AuthClient, "api">; params: URLSearchParams;
  apply: (params: Params) => void; handle: (e: unknown) => string;
}) {
  const [departments, setDepartments] = useState<Option[]>([]);
  const [positions, setPositions] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const departmentId = params.get("departmentId") ?? "";
  const positionId = params.get("positionId") ?? "";
  useEffect(() => {
    let active = true;
    Promise.all([loadMasters(client, "departments"), loadMasters(client, "positions")])
      .then(([departments, positions]) => { if (active) { setDepartments(departments); setPositions(positions); setError(""); } })
      .catch((e: unknown) => { if (active) setError(handle(e)); });
    return () => { active = false; };
  }, [client, handle]);
  function options(rows: Option[], id: string, label: string) {
    return [{ id: "", name: `Semua ${label}` }, ...(id && !rows.some(row => row.id === id) ? [{ id, name: `${label} terpilih` }] : []), ...rows];
  }
  const range = listDateRange(params);
  const clear = () => apply({ ...rangeQuery(null), departmentId: undefined, positionId: undefined, employeeId: undefined, page: undefined });
  const active = [
    ...(departmentId ? [{ key: "department", label: departments.find(row => row.id === departmentId)?.name ?? "Departemen terpilih", onRemove: () => apply({ departmentId: undefined, page: undefined }) }] : []),
    ...(positionId ? [{ key: "position", label: positions.find(row => row.id === positionId)?.name ?? "Jabatan terpilih", onRemove: () => apply({ positionId: undefined, page: undefined }) }] : []),
    ...(params.get("employeeId") ? [{ key: "employee", label: "Karyawan terpilih", onRemove: () => apply({ employeeId: undefined, page: undefined }) }] : []),
    ...(range ? [{ key: "period", label: range.startDate + " s.d. " + range.endDate, onRemove: () => apply(rangeQuery(null)) }] : []),
  ];
  return <div>
    <div className="attendance-filters">
      <FilterPanel active={active} onReset={clear}>
        <DateRangeField value={range} onChange={value => apply(rangeQuery(value))} />
        <FilterSelect label="Departemen" value={departmentId} options={options(departments, departmentId, "departemen")}
          onChange={value => apply({ departmentId: value || undefined, page: undefined })} />
        <FilterSelect label="Jabatan" value={positionId} options={options(positions, positionId, "jabatan")}
          onChange={value => apply({ positionId: value || undefined, page: undefined })} />
      </FilterPanel>
    </div>
    {error && <Notice message={error} />}
  </div>;
}
