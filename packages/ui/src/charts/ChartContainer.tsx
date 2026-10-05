import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Shared responsive frame for charts inside compact dashboard cards. */
export function ChartContainer({ children, label, height = 256 }: {
  children: ReactElement;
  label: string;
  height?: number;
}) {
  return <div className="chart-container" role="img" aria-label={label} style={{ height: `min(${height}px, var(--chart-responsive-height, ${height}px))` }}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      {children}
    </ResponsiveContainer>
  </div>;
}
