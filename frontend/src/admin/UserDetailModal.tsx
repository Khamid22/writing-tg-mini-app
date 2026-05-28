import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { AdminUserDetail } from "../adminApi";
import { fetchAdminUserDetail } from "../adminApi";
import { Metric } from "../components/Metric";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { fmtDate, fmtRelative } from "./format";

export function UserDetailModal({
  token,
  userId,
  onClose,
  onSetTier,
}: {
  token: string;
  userId: number | null;
  onClose: () => void;
  onSetTier: (userId: number, tier: "free" | "paid") => Promise<void>;
}): JSX.Element {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId === null) { setUser(null); return; }
    setLoading(true);
    fetchAdminUserDetail(token, userId)
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, userId]);

  return (
    <Modal open={userId !== null} onClose={onClose} title="User detail" size="sm">
      {loading || !user ? (
        <p className="muted">Loading...</p>
      ) : (
        <div className="admin-user-detail">
          <div className="admin-user-detail-header">
            <div className="admin-user-avatar">{user.display_name.charAt(0)}</div>
            <div>
              <h3>{user.display_name}</h3>
              <p>{user.username ? `@${user.username}` : "No username"}</p>
              <StatusBadge status={user.tier === "paid" ? "premium" : "free"} />
            </div>
          </div>
          <div className="admin-metrics admin-user-metrics">
            <Metric label="Words" value={user.learned_count} />
            <Metric label="Mastered" value={user.mastered_count} />
            <Metric label="Points" value={user.total_points} />
            <Metric label="Streak" value={`${user.streak_days}d`} />
            <Metric label="Accuracy" value={`${user.quiz_accuracy}%`} />
          </div>
          <div className="admin-user-detail-meta">
            <span>Joined: {fmtDate(user.created_at)}</span>
            <span>Last seen: {fmtRelative(user.last_seen_at)}</span>
            {user.premium_until ? <span>Premium until: {fmtDate(user.premium_until)}</span> : null}
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className={user.tier === "free" ? "primary-button" : "secondary-button"}
              onClick={() => { void onSetTier(user.id, user.tier === "free" ? "paid" : "free"); onClose(); }}
            >
              {user.tier === "free" ? "Grant premium" : "Revoke premium"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
