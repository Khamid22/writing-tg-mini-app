import type { JSX } from "react";
import { DAILY_FREE_LIMIT } from "../data";
import { dailyUsed } from "../storage";
import type { LearnerState } from "../types";
import { learnedWords } from "../helpers";
import { Metric } from "../components/Metric";

export function DashboardScreen({ state }: { state: LearnerState }): JSX.Element {
  const learned = learnedWords(state);
  const mastered = Object.values(state.progress).filter((item) => item.status === "mastered").length;
  const answered = Object.values(state.progress).reduce((total, item) => total + item.answered, 0);
  const correct = Object.values(state.progress).reduce((total, item) => total + item.correct, 0);
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

  return (
    <section className="dashboard-layout">
      <div className="metric-grid">
        <Metric label="O'rganildi" value={learned.length} />
        <Metric label="Ketma-ket" value={`${state.streak} kun`} />
        <Metric label="Aniqlik" value={`${accuracy}%`} />
        <Metric label="Mustahkam" value={mastered} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Bugun</h2>
          <span>{state.tier === "paid" ? "Cheksiz" : `${dailyUsed(state)}/${DAILY_FREE_LIMIT}`}</span>
        </div>
        <div className="progress-bar" aria-label="Kunlik rivojlanish">
          <span
            style={{ width: `${state.tier === "paid" ? 100 : (dailyUsed(state) / DAILY_FREE_LIMIT) * 100}%` }}
          />
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Oxirgi so'zlar</h2>
        </div>
        <div className="word-list">
          {learned.slice(0, 5).map((word) => (
            <div className="word-row" key={word.id}>
              <div>
                <strong>{word.word}</strong>
                <span>{word.uzbekDefinition}</span>
              </div>
              <span>{state.progress[word.id]?.mastery ?? 0}%</span>
            </div>
          ))}
          {learned.length === 0 ? <p className="muted">Hali so'z o'rganilmadi.</p> : null}
        </div>
      </section>
    </section>
  );
}
