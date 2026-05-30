import { useState } from "react";
import type { JSX } from "react";
import type { LearnerState } from "../types";

const LEVEL_OPTIONS = [
  { code: "A1", title: "Beginner", desc: "Oddiy so'zlardan boshlayman" },
  { code: "A2", title: "Elementary", desc: "Oddiy gaplarni tushunaman" },
  { code: "B1", title: "Pre-Intermediate", desc: "Kundalik mavzularda gaplasha olaman" },
  { code: "B2", title: "Intermediate", desc: "Writing va readingni kuchaytirmoqchiman" },
  { code: "C1", title: "Advanced", desc: "Kuchli vocabulary kerak" },
  { code: "C2", title: "Proficient", desc: "Professional uslub kerak" },
];

export function RegistrationPage({
  state,
  onBack,
  onComplete,
}: {
  state: LearnerState;
  onBack: () => void;
  onComplete: (displayName: string, selectedLevel: string) => void;
}): JSX.Element {
  const [displayName, setDisplayName] = useState(state.displayName);
  const [selectedLevel, setSelectedLevel] = useState(state.selectedLevel ?? "A1");
  const [plan, setPlan] = useState<"free" | "premium">("free");

  return (
    <main className="lp-shell lp-register simple">
      <section className="lp-register-main simple">
        <div className="lp-register-simple-head">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <button className="lp-back-link" type="button" onClick={onBack}>Bosh sahifa</button>
        </div>

        <div className="lp-formhead">
          <span>Registration</span>
          <span>Name · Level · Plan</span>
        </div>
        <h2>Profilni sozlash</h2>

        <div className="lp-field">
          <label htmlFor="display-name">Ism</label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            placeholder="Ali"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="lp-level-select">
          <div className="lp-field-label">Daraja</div>
          <div className="lp-level-grid">
            {LEVEL_OPTIONS.map((level) => (
              <button
                className="lp-level-option"
                data-active={selectedLevel === level.code}
                key={level.code}
                type="button"
                onClick={() => setSelectedLevel(level.code)}
              >
                <strong>{level.title}</strong>
                <span>{level.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lp-level-select">
          <div className="lp-field-label">Plan</div>
          <div className="lp-plan-grid">
            <button type="button" data-active={plan === "free"} onClick={() => setPlan("free")}>
              <strong>Free</strong>
              <span>Kuniga 10 ta word</span>
            </button>
            <button type="button" data-active={plan === "premium"} onClick={() => setPlan("premium")}>
              <strong>Premium</strong>
              <span>Cheksiz learning</span>
            </button>
          </div>
        </div>

        <div className="lp-reg-submit">
          <button className="lp-btn lp-accent" type="button" onClick={() => onComplete(displayName, selectedLevel)}>
            Boshlash
          </button>
        </div>
      </section>
    </main>
  );
}
