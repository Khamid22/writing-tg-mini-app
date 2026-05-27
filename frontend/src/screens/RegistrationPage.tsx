import { useState } from "react";
import type { JSX } from "react";
import type { LearnerState } from "../types";

export function RegistrationPage({
  state,
  onBack,
  onComplete,
}: {
  state: LearnerState;
  onBack: () => void;
  onComplete: (displayName: string) => void;
}): JSX.Element {
  const [displayName, setDisplayName] = useState(state.displayName);

  return (
    <main className="lp-shell lp-register">
      <aside className="lp-register-aside">
        <div className="lp-register-aside-top">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <button className="lp-back-link" type="button" onClick={onBack}>← Bosh sahifaga</button>
        </div>

        <div className="lp-register-pitch">
          <h1>Xush kelibsiz, <em>Qiroatxonaga</em>.</h1>
          <p>
            Bepul hisob birinchi o'nta kartangizni, taraqqiyot daftaringizni va boshqa o'quvchilar
            bilan sokin reytingni ochadi.
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
          <span>I-jild · №1</span>
          <span>Ro'yxat stoli</span>
        </div>
      </aside>

      <section className="lp-register-main">
        <div className="lp-formhead">
          <span>§ Ro'yxatdan o'tish</span>
          <span>Bir daqiqaga yetadi</span>
        </div>
        <h2>Hisobingizni oching.</h2>
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
          <div className="lp-field-hint">Bu ism reyting jadvalida ko'rinadi.</div>
        </div>
        <div className="lp-reg-submit">
          <button className="lp-btn lp-accent" type="button" onClick={() => onComplete(displayName)}>
            Hisobimni ochish
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
