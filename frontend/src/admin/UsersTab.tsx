import { useState } from "react";
import type { JSX } from "react";
import { Eye, Search } from "lucide-react";
import type { AdminUser } from "../adminApi";
import { fetchAdminAnalytics, fetchAdminUsers } from "../adminApi";
import { BarChart } from "./BarChart";
import { StatusBadge } from "./StatusBadge";
import { fmtDate, fmtRelative } from "./format";
import { useAdminFetch } from "./useAdminFetch";

export function UsersTab({
  token,
  onOpenDetail,
  onSetTier,
}: {
  token: string;
  onOpenDetail: (userId: number) => void;
  onSetTier: (userId: number, tier: "free" | "paid") => Promise<void>;
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");

  const analytics = useAdminFetch(() => fetchAdminAnalytics(token, 30), []);
  const users = useAdminFetch(
    () => fetchAdminUsers(token, { search, tier }),
    [search, tier],
    { debounceMs: 250 },
  );

  const signups = analytics.data?.signups ?? [];
  const dau = analytics.data?.dau ?? [];
  const items: AdminUser[] = users.data?.items ?? [];

  return (
    <section className="admin-users-layout admin-fade-in">
      <div className="admin-analytics-grid">
        <section className="admin-panel admin-chart-panel">
          <div className="admin-chart-head">
            <h3>New signups</h3>
            <span className="admin-chart-sub">Last 30 days</span>
          </div>
          <BarChart data={signups} />
          <div className="admin-chart-footer">
            <span>{signups.reduce((sum, d) => sum + d.count, 0)} total</span>
          </div>
        </section>
        <section className="admin-panel admin-chart-panel">
          <div className="admin-chart-head">
            <h3>Daily active users</h3>
            <span className="admin-chart-sub">Last 30 days</span>
          </div>
          <BarChart data={dau} color="var(--admin-green)" />
          <div className="admin-chart-footer">
            <span>peak: {Math.max(...dau.map((d) => d.count), 0)}</span>
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-tools">
          <label>
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username" />
          </label>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">All tiers</option>
            <option value="free">Free</option>
            <option value="paid">Premium</option>
          </select>
          <span className="admin-count-label">{users.data?.total ?? 0} users</span>
        </div>
        <div className="admin-table">
          <div className="admin-table-row admin-table-head admin-users-head">
            <span>User</span><span>Tier</span><span>Joined</span><span>Last seen</span>
            <span>Streak</span><span>Words</span><span>Points</span><span>Actions</span>
          </div>
          {users.loading ? <p className="muted admin-table-loading">Loading...</p> : null}
          {items.map((u) => (
            <div className="admin-table-row admin-row-hoverable admin-users-row" key={u.id}>
              <span className="admin-user-cell">
                <strong>{u.display_name}</strong>
                {u.username ? <em>@{u.username}</em> : null}
              </span>
              <span><StatusBadge status={u.tier === "paid" ? "premium" : "free"} /></span>
              <span>{fmtDate(u.created_at)}</span>
              <span>{fmtRelative(u.last_seen_at)}</span>
              <span>{u.streak_days}d</span>
              <span>{u.learned_count}</span>
              <span>{u.total_points}</span>
              <span className="admin-row-actions">
                <button type="button" title="View details" onClick={() => onOpenDetail(u.id)}><Eye size={15} /></button>
                <button
                  type="button"
                  title={u.tier === "free" ? "Grant premium" : "Revoke premium"}
                  className={u.tier === "free" ? "admin-btn-upgrade" : "admin-btn-downgrade"}
                  onClick={() => void onSetTier(u.id, u.tier === "free" ? "paid" : "free")}
                >
                  {u.tier === "free" ? "↑" : "↓"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
