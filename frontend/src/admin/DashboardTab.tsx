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
  const actionItems = [
    { label: "Payment approvals", value: stats?.pending_payments ?? 0 },
    { label: "Draft words", value: stats?.draft_words ?? 0 },
    { label: "Words without audio", value: stats?.missing_audio ?? 0 },
    { label: "Words without writing prompt", value: stats?.missing_writing_prompt ?? 0 },
  ];
  return (
    <section className="admin-dashboard admin-fade-in">
      <div className="admin-metrics">
        <Metric label="Active today" value={stats?.active_today ?? 0} />
        <Metric label="New users" value={stats?.new_users_today ?? 0} />
        <Metric label="Words today" value={stats?.words_learned_today ?? 0} />
        <Metric label="Tests today" value={stats?.tests_completed_today ?? 0} />
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-head">
            <h2>Learning Health</h2>
            <span>Are people learning, testing, and reviewing?</span>
          </div>
          <div className="admin-insight-list">
            <div><strong>{stats?.quiz_accuracy ?? 0}%</strong><span>Quiz accuracy. Low means content is unclear; too high means tests are too easy.</span></div>
            <div><strong>{stats?.limit_hits_today ?? 0}</strong><span>Users hit the free limit today. These are strong premium candidates.</span></div>
            <div><strong>{stats?.review_users_today ?? 0}</strong><span>Users reviewed older words today. This tells us if retention habits are forming.</span></div>
          </div>
        </section>

        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-head">
            <h2>Content Health</h2>
            <span>What should be improved next?</span>
          </div>
          <div className="admin-topic-list">
            {(summary?.topic_coverage ?? []).map((item) => (
              <div key={item.topic}><span>{item.topic}</span><strong>{item.count}</strong></div>
            ))}
            {(summary?.topic_coverage ?? []).length === 0 ? <p className="muted">No published topics yet.</p> : null}
          </div>
        </section>

        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-head">
            <h2>Weak Words</h2>
            <span>Words users miss in tests</span>
          </div>
          <div className="admin-mini-list">
            {(summary?.weak_words ?? []).map((word) => (
              <div className="admin-mini-static" key={`${word.word}-${word.level}`}>
                <strong>{word.word}</strong>
                <span>{word.accuracy}% accuracy · {word.answered} answers · {word.level}</span>
              </div>
            ))}
            {(summary?.weak_words ?? []).length === 0 ? <p className="muted">No quiz data yet.</p> : null}
          </div>
        </section>

        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-head">
            <h2>Action Needed</h2>
            <span>Admin work queue</span>
          </div>
          <div className="admin-action-list">
            {actionItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel admin-recent-panel">
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
