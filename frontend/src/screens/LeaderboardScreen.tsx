import type { JSX } from "react";
import { leaderboard } from "../data";
import type { LeaderboardUser } from "../data";
import type { LearnerState } from "../types";
import { learnedWords, userAccuracy } from "../helpers";

export function LeaderboardScreen({
  state,
  onSelectUser,
}: {
  state: LearnerState;
  onSelectUser: (user: LeaderboardUser) => void;
}): JSX.Element {
  const learned = learnedWords(state).length;
  const userPoints = learned * 20 + state.quizHistory.reduce((total, item) => total + item.score * 5, 0);
  const rows = [
    ...leaderboard,
    {
      id: 999,
      displayName: state.displayName,
      username: state.username,
      points: userPoints,
      learned,
      streak: state.streak,
      accuracy: userAccuracy(state),
    },
  ].sort((a, b) => b.points - a.points);

  return (
    <section className="leaderboard-layout">
      {rows.map((row, index) => (
        <button
          className="leader-row"
          data-current={row.id === 999}
          key={row.id}
          onClick={() => row.id !== 999 && onSelectUser(row)}
          type="button"
        >
          <span className="rank">{index + 1}</span>
          <div>
            <strong>{row.displayName}</strong>
            <span>@{row.username}</span>
          </div>
          <strong>{row.points}</strong>
        </button>
      ))}
    </section>
  );
}
