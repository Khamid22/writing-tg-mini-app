import { useState } from "react";
import type { JSX } from "react";
import type { LearnerState } from "../types";

const LEVEL_OPTIONS = [
  { code: "A1", title: "Beginner", desc: "Oddiy so'zlardan boshlayman" },
  { code: "A2", title: "Elementary", desc: "Oddiy gaplarni tushunaman" },
  { code: "B1", title: "Pre-Intermediate", desc: "Kundalik mavzularda gaplasha olaman" },
  { code: "B2", title: "Intermediate", desc: "Writing va readingni kuchaytirmoqchiman" },
  { code: "C1", title: "Advanced", desc: "Aniq, kuchli vocabulary kerak" },
  { code: "C2", title: "Proficient", desc: "Nozik ma'nolar va professional uslub" },
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

  return (
    <main className="lp-shell lp-register">
      <aside className="lp-register-aside">
        <div className="lp-register-aside-top">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <button className="lp-back-link" type="button" onClick={onBack}>← Bosh sahifaga</button>
        </div>

        <div className="lp-register-pitch">
          <h1>VocabHelper bilan boshlang.</h1>
          <p>
            Ismingizni yozing. Progress, test natijalari va leaderboard shu profilga saqlanadi.
          </p>
          <div className="lp-reg-mini">
            <div className="lp-reg-mini-meta">
              <span>Birinchi kartangiz</span>
              <span>№ 0001</span>
            </div>
            <div className="lp-reg-mini-word">welcome</div>
            <div className="lp-reg-mini-phon">/ˈwɛl.kəm/ · undov</div>
          </div>
        </div>

        <div className="lp-register-aside-meta">
          <span>Free plan: kuniga 10 ta word</span>
          <span>Premium: limit yo'q</span>
        </div>
      </aside>

      <section className="lp-register-main">
        <div className="lp-formhead">
          <span>Profil</span>
          <span>Tez boshlash</span>
        </div>
        <h2>Ismingizni kiriting.</h2>
        <div className="lp-field">
          <label htmlFor="display-name">Ko'rinadigan ism</label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            placeholder="Ali"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div className="lp-field-hint">Bu ism leaderboardda ko'rinadi.</div>
        </div>
        <div className="lp-level-select">
          <div className="lp-field-label">Darajangizni tanlang</div>
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
        <div className="lp-reg-submit">
          <button className="lp-btn lp-accent" type="button" onClick={() => onComplete(displayName, selectedLevel)}>
            Boshlash
          </button>
          <span className="lp-reg-or">
            yoki{" "}
            <button className="lp-text-link" type="button" onClick={onBack}>
              bosh sahifaga qaytish
            </button>
          </span>
        </div>
      </section>
    </main>
  );
}
