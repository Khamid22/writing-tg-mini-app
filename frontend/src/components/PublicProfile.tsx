import type { JSX } from "react";
import type { LeaderboardUser } from "../data";
import { Metric } from "./Metric";

export function PublicProfile({
  user,
  onClose,
}: {
  user: LeaderboardUser;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        className="public-profile"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="avatar">{user.displayName.charAt(0)}</div>
        <h2>{user.displayName}</h2>
        <p>@{user.username}</p>
        <div className="metric-grid compact">
          <Metric label="So'zlar" value={user.learned} />
          <Metric label="Ketma-ket" value={`${user.streak} kun`} />
          <Metric label="Aniqlik" value={`${user.accuracy}%`} />
          <Metric label="Ball" value={user.points} />
        </div>
        <button className="primary-button wide" type="button" onClick={onClose}>
          Yopish
        </button>
      </section>
    </div>
  );
}
