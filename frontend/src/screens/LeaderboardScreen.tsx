import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { LeaderboardItem } from "../api";
import { fetchLeaderboard } from "../api";
import type { LearnerState } from "../types";

export function LeaderboardScreen({
  state,
  onSelectUser,
  apiToken,
}: {
  state: LearnerState;
  onSelectUser: (userId: number) => void;
  apiToken: string | null;
}): JSX.Element {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiToken) return;
    setLoading(true);
    fetchLeaderboard("weekly")
      .then(({ items: rows }) => setItems(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiToken]);

  if (!apiToken || loading) {
    return (
      <section className="empty-panel">
        <p className="muted">Yuklanmoqda...</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="empty-panel">
        <p className="muted">Hali reyting yo'q.</p>
      </section>
    );
  }

  return (
    <section className="leaderboard-layout">
      {items.map((row) => (
        <button
          className="leader-row"
          data-current={row.user_id === state.userId}
          key={row.user_id}
          onClick={() => onSelectUser(row.user_id)}
          type="button"
        >
          <span className="rank">{row.rank}</span>
          <div>
            <strong>{row.display_name}</strong>
            <span>@{row.username ?? "—"}</span>
          </div>
          <strong>{row.points}</strong>
        </button>
      ))}
    </section>
  );
}
