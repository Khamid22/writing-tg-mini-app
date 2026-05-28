import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { ApiWord, DashboardResponse } from "../api";
import { fetchDashboard } from "../api";
import { Metric } from "../components/Metric";
import type { LearnerState } from "../types";

export function DashboardScreen({
  state,
  apiToken,
}: {
  state: LearnerState;
  apiToken: string | null;
}): JSX.Element {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiToken) return;
    setLoading(true);
    fetchDashboard()
      .then(setData)
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

  if (!data) {
    return (
      <section className="empty-panel">
        <p className="muted">Ma'lumot yuklanmadi.</p>
      </section>
    );
  }

  const { stats, recent_words } = data;
  const dailyMax = stats.daily_limit ?? 100;
  const dailyUsed = stats.learned_today;

  return (
    <section className="dashboard-layout">
      <div className="metric-grid">
        <Metric label="O'rganildi" value={stats.learned_total} />
        <Metric label="Ketma-ket" value={`${stats.streak_days} kun`} />
        <Metric label="Aniqlik" value={`${stats.quiz_accuracy}%`} />
        <Metric label="Mustahkam" value={stats.mastered_total} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Bugun</h2>
          <span>{state.tier === "paid" ? "Cheksiz" : `${dailyUsed}/${dailyMax}`}</span>
        </div>
        <div className="progress-bar" aria-label="Kunlik rivojlanish">
          <span style={{ width: `${state.tier === "paid" ? 100 : (dailyUsed / dailyMax) * 100}%` }} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Oxirgi so'zlar</h2>
        </div>
        <div className="word-list">
          {recent_words.map((word: ApiWord) => (
            <div className="word-row" key={word.id}>
              <div>
                <strong>{word.word}</strong>
                <span>{word.topic || word.uzbek_definition}</span>
              </div>
              <span>{state.progress[word.id]?.mastery ?? 0}%</span>
            </div>
          ))}
          {recent_words.length === 0 ? <p className="muted">Hali so'z o'rganilmadi.</p> : null}
        </div>
      </section>
    </section>
  );
}
