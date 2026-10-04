import type { ChartSeriesConfig } from "./ChartTooltip";

export function ChartLegend({ series }: { series: ChartSeriesConfig }) {
  return <ul className="chart-legend" aria-label="Keterangan grafik">
    {Object.entries(series).map(([key, item]) => <li key={key}>
      <span className="chart-legend__swatch" style={{ background: item.color }} aria-hidden="true" />
      {item.label}
    </li>)}
  </ul>;
}
