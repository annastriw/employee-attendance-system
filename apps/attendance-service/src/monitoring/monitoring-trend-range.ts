const MAX_TREND_DAYS = 92;

export interface MonitoringTrendRange {
  startDate: string;
  endDate: string;
  dates: string[];
}

function dateOrdinal(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return Math.floor(parsed.getTime() / 86_400_000);
}

export function monitoringTrendRange(startDate: string, endDate: string): MonitoringTrendRange | null {
  const start = dateOrdinal(startDate);
  const end = dateOrdinal(endDate);
  if (start === null || end === null || end < start || end - start + 1 > MAX_TREND_DAYS) return null;
  return {
    startDate,
    endDate,
    dates: Array.from({ length: end - start + 1 }, (_, index) =>
      new Date((start + index) * 86_400_000).toISOString().slice(0, 10)),
  };
}
