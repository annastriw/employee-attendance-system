import { describe, expect, it, vi } from "vitest";
import { listDateRange, rangeQuery } from "@attendance/ui";
import { loadMasters } from "./employees";

describe("list filters", () => {
  const now = new Date("2026-10-04T18:00:00Z");
  it("uses an inclusive 30-day WIB default and preserves explicit dates", () => {
    expect(listDateRange(new URLSearchParams(), now)).toEqual({ startDate: "2026-09-06", endDate: "2026-10-05" });
    expect(listDateRange(new URLSearchParams("startDate=2026-01-01&endDate=2026-01-03"), now)).toEqual({ startDate: "2026-01-01", endDate: "2026-01-03" });
  });
  it("clears dates explicitly and resets pagination/detail", () => {
    expect(listDateRange(new URLSearchParams("period=ALL"), now)).toBeNull();
    expect(rangeQuery(null)).toEqual({ startDate: undefined, endDate: undefined, period: "ALL", page: undefined, id: undefined });
    expect(rangeQuery({ startDate: "2026-01-01", endDate: "2026-01-02" }).period).toBeUndefined();
  });
  it("rejects reversed or impossible dates before constructing a query", () => {
    expect(() => rangeQuery({ startDate: "2026-02-30", endDate: "2026-03-02" })).toThrow();
    expect(() => rangeQuery({ startDate: "2026-03-02", endDate: "2026-03-01" })).toThrow();
  });
  it("loads every master page, keeps inactive context, and sorts Indonesian names", async () => {
    const api = vi.fn().mockResolvedValueOnce({ items: [{ id: "z", name: "Zebra", status: "ACTIVE" }], total: 2, pageSize: 1 })
      .mockResolvedValueOnce({ items: [{ id: "a", name: "Analis", status: "INACTIVE" }], total: 2, pageSize: 1 });
    const rows = await loadMasters({ api: api as never }, "departments");
    expect(rows.map(row => row.id)).toEqual(["a", "z"]);
    expect(api.mock.calls.map(([path]) => path)).toEqual(["departments?pageSize=100&page=1", "departments?pageSize=100&page=2"]);
  });
});
