import type { JSX } from "react";
import { CreditCard } from "lucide-react";
import type { LearnerState } from "../types";
import { countLearned } from "../helpers";
import { updatePreferences } from "../api";

const LEVEL_OPTIONS = [
  { code: "A1", label: "Beginner" },
  { code: "A2", label: "Elementary" },
  { code: "B1", label: "Pre-Intermediate" },
  { code: "B2", label: "Intermediate" },
  { code: "C1", label: "Advanced" },
  { code: "C2", label: "Proficient" },
];

export function ProfileScreen({
  state,
  updateState,
  onLogout,
}: {
  state: LearnerState;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
  onLogout: () => void;
}): JSX.Element {
  const script = state.uzbekScript ?? "latin";
  function setLevel(level: string): void {
    updateState((current) => ({ ...current, selectedLevel: level }));
    updatePreferences({ selected_level: level }).catch(() => {});
  }

  return (
    <section className="profile-layout">
      <div className="profile-card">
        <div className="avatar">{state.displayName.charAt(0).toUpperCase()}</div>
        <h2>{state.displayName}</h2>
        <p>@{state.username}</p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Tarif</h2>
          <span>{state.tier === "paid" ? "pullik" : "bepul"}</span>
        </div>
        {state.tier === "paid" ? (
          <p className="muted">Premium faol. Cheksiz so'z o'rganish ochiq.</p>
        ) : (
          <div className="payment-panel inline-payment-note">
            <CreditCard size={18} />
            <p>Premium sotib olish uchun botga <strong>/start</strong> yuboring va <strong>Premium sotib olish</strong> tugmasini bosing.</p>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="profile-stat">
          <span>Daraja</span>
          <strong>{LEVEL_OPTIONS.find((level) => level.code === state.selectedLevel)?.label ?? "Beginner"}</strong>
        </div>
        <div className="profile-stat">
          <span>Kunlik limit</span>
          <strong>{state.tier === "paid" ? "Cheksiz" : "10 ta so'z"}</strong>
        </div>
        <div className="profile-stat">
          <span>O'rganilgan so'zlar</span>
          <strong>{countLearned(state.progress)} ta so'z</strong>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Daraja</h2>
          <span>Istalgan payt o'zgartiring</span>
        </div>
        <div className="level-toggle" role="group" aria-label="English level">
          {LEVEL_OPTIONS.map((level) => (
            <button
              key={level.code}
              type="button"
              data-active={state.selectedLevel === level.code}
              onClick={() => setLevel(level.code)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Yozuv</h2>
          <span>{script === "cyrillic" ? "Кирилл" : "Latin"}</span>
        </div>
        <div className="script-toggle" role="group" aria-label="Uzbek yozuvi">
          <button
            type="button"
            data-active={script === "latin"}
            onClick={() => updateState((current) => ({ ...current, uzbekScript: "latin" }))}
          >
            Lotincha
          </button>
          <button
            type="button"
            data-active={script === "cyrillic"}
            onClick={() => updateState((current) => ({ ...current, uzbekScript: "cyrillic" }))}
          >
            Кириллча
          </button>
        </div>
      </section>
      <button className="secondary-button wide" type="button" onClick={onLogout}>
        Chiqish
      </button>
    </section>
  );
}
