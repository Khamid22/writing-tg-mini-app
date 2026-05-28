import type { JSX } from "react";
import type { AnalyticsPoint } from "../adminApi";

export function BarChart({ data, color }: { data: AnalyticsPoint[]; color?: string }): JSX.Element {
  if (data.length === 0) return <div className="admin-chart-empty">No data</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 400;
  const H = 72;
  const gap = 2;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const fill = color ?? "var(--admin-accent)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="admin-spark-chart" aria-hidden="true">
      {data.map((d, i) => {
        const h = Math.max(2, (d.count / max) * H);
        return (
          <rect
            key={d.date}
            x={i * (barW + gap)}
            y={H - h}
            width={barW}
            height={h}
            fill={fill}
            rx={1}
          >
            <title>{d.date}: {d.count}</title>
          </rect>
        );
      })}
    </svg>
  );
}
