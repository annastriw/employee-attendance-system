import { describe, expect, it } from "vitest";
import { dateRangePreset, isDateRange } from "../../../../packages/ui/src/lib/date-range";
describe("date range presets in WIB", () => {
  const now = new Date("2026-09-30T18:00:00Z");
  it("uses WIB today rather than UTC and includes today in each rolling range", () => {
    expect(dateRangePreset("today", now)).toEqual({ startDate: "2026-10-01", endDate: "2026-10-01" });
    expect(dateRangePreset("7days", now)).toEqual({ startDate: "2026-09-25", endDate: "2026-10-01" });
    expect(dateRangePreset("30days", now)).toEqual({ startDate: "2026-09-02", endDate: "2026-10-01" });
    expect(dateRangePreset("month", now)).toEqual({ startDate: "2026-10-01", endDate: "2026-10-01" });
  });
  it("handles leap day and year boundaries", () => {
    expect(dateRangePreset("7days", new Date("2028-03-01T08:00:00+07:00"))).toEqual({ startDate: "2028-02-24", endDate: "2028-03-01" });
    expect(dateRangePreset("7days", new Date("2027-01-01T08:00:00+07:00"))).toEqual({ startDate: "2026-12-26", endDate: "2027-01-01" });
  });
  it("rejects impossible, incomplete and reversed ranges", () => {
    expect(isDateRange({ startDate: "2028-02-29", endDate: "2028-03-01" })).toBe(true);
    for (const startDate of ["2026-02-29", "2026-02-31", "", "2026-1-1", "2026-10-02"]) {
      expect(isDateRange({ startDate, endDate: "2026-10-01" })).toBe(false);
    }
  });
});
