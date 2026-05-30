import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Flame } from "lucide-react";
import type { ApiWord, DashboardResponse } from "../api";
import { fetchDashboard } from "../api";
import type { LearnerState } from "../types";
import { MotionProgress } from "../uiMotion";

// Motivational milestone ladder — the next goal the learner is climbing toward.
const MILESTONES = [10, 25, 50, 100, 200, 300, 500, 750, 1000];

function nextMilestone(learned: number): number {
  for (const milestone of MILESTONES) {
    if (milestone > learned) return milestone;
  }
  return Math.ceil((learned + 1) / 500) * 500;
}

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
      .then((res) => {
        setData(res);
      })
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
  const dailyMax = Math.max(stats.daily_limit ?? 100, 1);
  const dailyUsed = stats.learned_today;
  const dailyProgress = state.tier === "paid" ? 100 : (dailyUsed / dailyMax) * 100;
  const goal = nextMilestone(stats.learned_total);
  const goalProgress = goal > 0 ? Math.min(100, (stats.learned_total / goal) * 100) : 0;

  return (
    <section className="dashboard-layout">
      <section className="panel dash-hero">
        <div className="dash-hero-top">
          <div className="dash-hero-headline">
            <span className="dash-hero-label">O'rganilgan so'zlar</span>
            <strong className="dash-hero-num">{stats.learned_total}</strong>
            {stats.mastered_total > 0 ? (
              <span className="dash-hero-sub">shulardan {stats.mastered_total} ta mustahkam</span>
            ) : null}
          </div>
          <div className="dash-streak" aria-label="Ketma-ket kunlar">
            <Flame size={15} /> {stats.streak_days} kun
          </div>
        </div>
        <div className="dash-hero-goal">
          <div className="progress-bar" aria-label="Keyingi maqsad sari rivojlanish">
            <MotionProgress value={goalProgress} />
          </div>
          <span>Keyingi maqsad: {goal} ta so'z</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Bugungi maqsad</h2>
          <span>{state.tier === "paid" ? "Cheksiz" : `${dailyUsed}/${dailyMax}`}</span>
        </div>
        <div className="progress-bar" aria-label="Kunlik rivojlanish">
          <MotionProgress value={dailyProgress} />
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
                <strong data-script-lock>{word.word}</strong>
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
