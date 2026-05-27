import type { JSX } from "react";

export function Metric({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
