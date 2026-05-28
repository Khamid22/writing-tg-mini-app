import { useState } from "react";
import type { JSX } from "react";
import { Check, Trash2 } from "lucide-react";
import { fetchAdminPayments } from "../adminApi";
import { Metric } from "../components/Metric";
import { StatusBadge } from "./StatusBadge";
import { fmtDate, fmtMoney } from "./format";
import { useAdminFetch } from "./useAdminFetch";

const STATUSES = ["all", "pending", "submitted", "approved", "cancelled", "expired"] as const;
const EMPTY_COUNTS = { pending: 0, submitted: 0, approved: 0, cancelled: 0 };

export function PaymentsTab({
  token,
  onAction,
  reloadKey,
}: {
  token: string;
  onAction: (code: string, action: "approve" | "cancel") => Promise<void>;
  reloadKey: number;
}): JSX.Element {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const { data, loading } = useAdminFetch(
    () => fetchAdminPayments(token, { status }),
    [status, reloadKey],
  );
  const items = data?.items ?? [];
  const counts = data?.counts ?? EMPTY_COUNTS;

  return (
    <section className="admin-payments-layout admin-fade-in">
      <div className="admin-metrics">
        <Metric label="Pending" value={counts.pending} />
        <Metric label="Submitted" value={counts.submitted} />
        <Metric label="Approved" value={counts.approved} />
        <Metric label="Cancelled" value={counts.cancelled} />
      </div>
      <section className="admin-panel">
        <div className="admin-tools admin-payment-filters">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className="admin-filter-tab"
              data-active={status === s}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
          <span className="admin-count-label">{data?.total ?? 0} total</span>
        </div>
        <div className="admin-table">
          <div className="admin-table-row admin-table-head admin-payments-head">
            <span>Code</span><span>User</span><span>Amount</span><span>Status</span>
            <span>Created</span><span>Submitted</span><span>Actions</span>
          </div>
          {loading ? <p className="muted admin-table-loading">Loading...</p> : null}
          {items.map((p) => {
            const actionable = p.status === "pending" || p.status === "submitted";
            return (
              <div className="admin-table-row admin-row-hoverable admin-payments-row" key={p.id}>
                <span className="admin-payment-code">{p.code}</span>
                <span className="admin-user-cell">
                  <strong>{p.user_display_name}</strong>
                  {p.user_username ? <em>@{p.user_username}</em> : null}
                </span>
                <span>{fmtMoney(p.amount_uzs)}</span>
                <span><StatusBadge status={p.status} /></span>
                <span>{fmtDate(p.created_at)}</span>
                <span>{fmtDate(p.submitted_at)}</span>
                <span className="admin-row-actions">
                  {actionable ? (
                    <>
                      <button
                        type="button"
                        title="Approve"
                        className="admin-btn-approve"
                        onClick={() => void onAction(p.code, "approve")}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        className="admin-btn-cancel"
                        onClick={() => void onAction(p.code, "cancel")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : <span className="muted">—</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
