import type { TooltipContentProps } from "recharts";

export type ChartSeriesConfig = Record<string, { label: string; color: string }>;

export function ChartTooltip({ active, payload, label, series }:
  Partial<TooltipContentProps<number, string>> & { series: ChartSeriesConfig }) {
  if (!active || !payload?.length) return null;
  const date = typeof label === "string" && /^\d{4}-\d{2}-\d{2}$/.test(label)
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" })
      .format(new Date(`${label}T00:00:00+07:00`))
    : String(label ?? "");
  return <div className="chart-tooltip">
    <p className="chart-tooltip__title">{date}</p>
    {payload.map((item, index) => {
      const key = String(item.dataKey ?? item.name ?? index);
      const config = series[key];
      return <div className="chart-tooltip__row" key={`${key}-${index}`}>
        <span className="chart-tooltip__swatch" style={{ background: config?.color ?? item.color }} />
        <span>{config?.label ?? item.name}</span>
        <strong>{Number(item.value ?? 0).toLocaleString("id-ID")}</strong>
      </div>;
    })}
  </div>;
}
