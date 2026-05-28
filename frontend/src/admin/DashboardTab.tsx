import type { JSX } from "react";
import type { AdminSummary, AdminWord } from "../adminApi";
import { Metric } from "../components/Metric";

function statusLabel(word: AdminWord): string {
  return word.is_active ? "Published" : "Draft";
}

export function DashboardTab({
  summary,
  onOpenWords,
  onEditWord,
}: {
  summary: AdminSummary | null;
  onOpenWords: () => void;
  onEditWord: (word: AdminWord) => void;
}): JSX.Element {
  const stats = summary?.stats;
  return (
    <section className="admin-dashboard admin-fade-in">
      <div className="admin-metrics">
        <Metric label="Total words" value={stats?.total_words ?? 0} />
        <Metric label="Published" value={stats?.published_words ?? 0} />
        <Metric label="Drafts" value={stats?.draft_words ?? 0} />
        <Metric label="Users" value={stats?.total_users ?? 0} />
        <Metric label="Premium" value={stats?.premium_users ?? 0} />
        <Metric label="Pending pay" value={stats?.pending_payments ?? 0} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Recent words</h2>
          <button type="button" onClick={onOpenWords}>Open library</button>
        </div>
        <div className="admin-mini-list">
          {(summary?.recent_words ?? []).map((word) => (
            <button key={word.id} type="button" onClick={() => onEditWord(word)}>
              <strong>{word.word}</strong>
              <span>{word.level} · {statusLabel(word)}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
