import type { JSX } from "react";

export function StatusBadge({ status }: { status: string }): JSX.Element {
  return <span className={`admin-badge admin-badge-${status}`}>{status}</span>;
}
