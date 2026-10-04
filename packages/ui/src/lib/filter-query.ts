import { dateRangePreset, isDateRange, type DateRangeValue } from "./date-range";

export function listDateRange(params: URLSearchParams, now?: Date): DateRangeValue | null {
  if (params.get("period") === "ALL") return null;
  const value = { startDate: params.get("startDate") ?? "", endDate: params.get("endDate") ?? "" };
  if (isDateRange(value)) return value;
  return dateRangePreset("30days", now);
}
export function rangeQuery(value: DateRangeValue | null): Record<string, string | undefined> {
  if (value && !isDateRange(value)) throw new Error("Rentang tanggal tidak valid.");
  return { startDate: value?.startDate, endDate: value?.endDate, period: value ? undefined : "ALL", page: undefined, id: undefined };
}
