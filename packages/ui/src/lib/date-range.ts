export interface DateRangeValue { startDate: string; endDate: string }
export type DateRangePreset = "today" | "7days" | "30days" | "month";
export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "7days", label: "7 hari" },
  { id: "30days", label: "30 hari" },
  { id: "month", label: "Bulan ini" },
];
export function dateRangePreset(preset: DateRangePreset, now = new Date()): DateRangeValue {
  // Calendar arithmetic is performed on a UTC date representing the WIB day.
  const endDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const start = new Date(endDate + "T00:00:00Z");
  if (preset === "month") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - (preset === "7days" ? 6 : preset === "30days" ? 29 : 0));
  return { startDate: start.toISOString().slice(0, 10), endDate };
}
export function isDateRange(value: DateRangeValue): boolean {
  const valid = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  return valid(value.startDate) && valid(value.endDate) && value.startDate <= value.endDate;
}
