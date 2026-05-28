import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { PublicProfileResponse } from "../api";
import { fetchPublicProfile } from "../api";
import { Metric } from "./Metric";

export function PublicProfile({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}): JSX.Element {
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);

  useEffect(() => {
    fetchPublicProfile(userId)
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        className="public-profile"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {profile ? (
          <>
            <div className="avatar">{profile.user.display_name.charAt(0)}</div>
            <h2>{profile.user.display_name}</h2>
            <p>@{profile.user.username ?? "—"}</p>
            <div className="metric-grid compact">
              <Metric label="So'zlar" value={profile.stats.learned_total} />
              <Metric label="Ketma-ket" value={`${profile.stats.streak_days} kun`} />
              <Metric label="Mustahkam" value={profile.stats.mastered_total} />
              <Metric label="Ball" value={profile.stats.total_points} />
            </div>
            <div className="profile-recent">
              <div className="panel-heading">
                <h2>Oxirgi so'zlar</h2>
              </div>
              <div className="word-list">
                {profile.recent_words.map((word) => (
                  <div className="word-row" key={word.id}>
                    <div>
                      <strong>{word.word}</strong>
                      <span>{word.topic || word.level}</span>
                    </div>
                    <span>{word.uzbek_definition}</span>
                  </div>
                ))}
                {profile.recent_words.length === 0 ? <p className="muted">Hali so'z o'rganilmagan.</p> : null}
              </div>
            </div>
          </>
        ) : (
          <p className="muted">Yuklanmoqda...</p>
        )}
        <button className="primary-button wide" type="button" onClick={onClose}>
          Yopish
        </button>
      </section>
    </div>
  );
}
