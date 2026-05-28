import { useState, useRef, type JSX } from "react";

function speakWord(word: string, btn: HTMLButtonElement): void {
  if (!("speechSynthesis" in window)) return;
  btn.classList.add("lp-speaking");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.85;
  const done = (): void => btn.classList.remove("lp-speaking");
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
  setTimeout(done, 2500);
}

export function LandingPage({ onRegister }: { onRegister: () => void }): JSX.Element {
  const [flipped, setFlipped] = useState(false);
  const tryRef = useRef<HTMLElement>(null);

  const today = new Date();
  const months = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
  const dateStr = `${today.getDate()} ${months[today.getMonth()]}, ${today.getFullYear()}`;

  function scrollToTry(e: React.MouseEvent): void {
    e.preventDefault();
    tryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="lp-shell">
      <header className="lp-topbar">
        <div className="lp-wrap lp-topbar-inner">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <nav className="lp-nav">
            <a href="#features">Imkoniyatlar</a>
            <a href="#try">Karta</a>
            <a href="#pricing">Tarif</a>
            <button className="lp-nav-cta" type="button" onClick={onRegister}>Boshlash</button>
          </nav>
        </div>
      </header>

      <div className="lp-masthead">
        <div className="lp-wrap lp-masthead-inner">
          <span>VocabHelper</span>
          <span>Har kuni inglizcha so'z o'rganish</span>
          <span>{dateStr}</span>
        </div>
      </div>

      <section className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero-grid">
            <div>
              <div className="lp-eyebrow">English vocabulary uchun mini app</div>
              <h1 className="lp-headline">So'z yodlashni oddiy odatga aylantiring.</h1>
              <p className="lp-lede">
                VocabHelper har kuni yangi English words beradi: pronunciation, Uzbek meaning,
                real example va qisqa test bitta joyda. Keraksiz darslar va chalkash yo'llarsiz.
              </p>
              <div className="lp-cta-row">
                <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Boshlash</button>
                <button className="lp-btn lp-ghost" type="button" onClick={scrollToTry}>Kartani ko'rish</button>
              </div>
              <p className="lp-cta-fine">Free plan: kuniga 10 ta so'z. Premium: limit yo'q.</p>
            </div>

            <aside className="lp-hero-aside">
              <div className="lp-card-stack">
                <div className="lp-stack-card lp-s3" />
                <div className="lp-stack-card lp-s2" />
                <div className="lp-stack-card lp-s1">
                  <div className="lp-card-meta">
                    <span>Karta · B2</span>
                    <span>№ 0042</span>
                  </div>
                  <div>
                    <div className="lp-card-word">ephemeral</div>
                    <div className="lp-card-phon">/ɪˈfɛm.ər.əl/ · sifat</div>
                  </div>
                  <div className="lp-card-foot">
                    <span>Aylantirish uchun bosing</span>
                    <button
                      className="lp-speaker"
                      type="button"
                      aria-label="Talaffuz"
                      onClick={(e) => speakWord("ephemeral", e.currentTarget)}
                    >♪</button>
                  </div>
                </div>
              </div>
              <div className="lp-aside-caption">
                <span className="lp-cap-num">Demo.</span>Asosiy o'rganish ekrani shu formatda ishlaydi.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="lp-promise" id="features">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <div className="lp-section-label">Nima beradi</div>
            <h2 className="lp-section-h2">So'z o'rganish uchun kerakli narsalar. Ortiqchasi yo'q.</h2>
          </div>
          <div className="lp-pillars">
            <article className="lp-pillar">
              <div className="lp-pillar-letter">1.</div>
              <h3>Har kuni aniq vazifa.</h3>
              <p>Bugun qaysi so'zni o'rganish kerakligi tayyor. Siz faqat kartani ochasiz, eshitasiz va eslab qolasiz.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">2.</div>
              <h3>Pronunciation va example.</h3>
              <p>So'z faqat tarjima emas. Talaffuz, English definition, Uzbek meaning va gap ichidagi ishlatilishi bir kartada.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">3.</div>
              <h3>Progress ko'rinib turadi.</h3>
              <p>O'rgangan so'zlaringiz, test natijalari va streak profil ichida saqlanadi.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">4.</div>
              <h3>Community va raqobat.</h3>
              <p>Leaderboard orqali boshqa foydalanuvchilar progressini ko'rasiz va o'zingizni solishtirasiz.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-try" id="try" ref={tryRef}>
        <div className="lp-wrap">
          <div className="lp-try-grid">
            <div className="lp-try-copy">
              <div className="lp-section-label" style={{ marginBottom: "24px" }}>Karta qanday ishlaydi</div>
              <h2>Bir karta — bitta so'z, pronunciation va real example.</h2>
              <p>
                Old tomonda so'z va talaffuz bor. Orqa tomonda English definition, Uzbek meaning
                va example chiqadi. Keyin test mode orqali eslab qolganingizni tekshirasiz.
              </p>
              <ul className="lp-try-list">
                <li><span className="lp-n">1</span><span>So'zni ko'ring va avval o'zingiz ma'nosini eslashga harakat qiling.</span></li>
                <li><span className="lp-n">2</span><span><strong>♪</strong> tugmasi bilan pronunciation eshiting.</span></li>
                <li><span className="lp-n">3</span><span>Kartani aylantirib, meaning va examplesni tekshiring.</span></li>
              </ul>
            </div>
            <div>
              <div className="lp-flashcard-wrap">
                <div
                  className={`lp-flashcard${flipped ? " lp-flipped" : ""}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest(".lp-speaker")) return;
                    setFlipped((f) => !f);
                  }}
                >
                  <div className="lp-face lp-front">
                    <div className="lp-face-meta">
                      <span>Karta · B2 · Adabiy</span>
                      <span>№ 0042</span>
                    </div>
                    <div>
                      <div className="lp-word">ephemeral</div>
                      <div className="lp-phon">/ɪˈfɛm.ər.əl/ · sifat</div>
                    </div>
                    <div className="lp-hint">
                      <em>Ma'noni ko'rish uchun bosing.</em>
                      <button
                        className="lp-speaker"
                        type="button"
                        aria-label="Talaffuz"
                        onClick={(e) => { e.stopPropagation(); speakWord("ephemeral", e.currentTarget); }}
                      >♪</button>
                    </div>
                  </div>
                  <div className="lp-face lp-back">
                    <div className="lp-face-meta">
                      <span>Ma'no</span>
                      <span>№ 0042</span>
                    </div>
                    <div className="lp-back-defs">
                      <dl>
                        <dt>Inglizcha</dt>
                        <dd>Lasting for a very short time; fleeting.</dd>
                        <dt>O'zbekcha</dt>
                        <dd>Juda qisqa muddat davom etadigan; o'tkinchi, tez o'tib ketadigan.</dd>
                        <dt>Misol</dt>
                        <dd><em>"The cherry blossoms are beautiful but ephemeral — gone in a week."</em></dd>
                      </dl>
                    </div>
                    <div className="lp-hint">
                      <em>Orqaga qaytarish uchun yana bosing.</em>
                      <button
                        className="lp-speaker"
                        type="button"
                        aria-label="Talaffuz"
                        onClick={(e) => { e.stopPropagation(); speakWord("ephemeral", e.currentTarget); }}
                      >♪</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-card-controls">
                <button className="lp-icon-btn" type="button" onClick={() => setFlipped((f) => !f)}>Kartani aylantirish</button>
                <button className="lp-icon-btn" type="button" onClick={onRegister}>Boshlash</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-pricing" id="pricing">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <div className="lp-section-label">Tariflar</div>
            <h2 className="lp-section-h2">Free plan boshlash uchun yetadi. Premium ko'proq o'rganadiganlar uchun.</h2>
          </div>
          <div className="lp-price-grid">
            <div className="lp-tier">
              <div className="lp-tier-kicker">Free</div>
              <h3>Bepul</h3>
              <div className="lp-tier-price">0 UZS<span className="lp-per"> / doimiy</span></div>
              <ul>
                <li><span>Kuniga yangi so'zlar</span><span className="lp-val">10 tagacha</span></li>
                <li><span>Talaffuz (audio)</span><span className="lp-val">bor</span></li>
                <li><span>Tarjima va misollar</span><span className="lp-val">bor</span></li>
                <li><span>Test rejimi</span><span className="lp-val">bor</span></li>
                <li><span>Dashbord va do'stlar</span><span className="lp-val">bor</span></li>
              </ul>
              <button className="lp-btn lp-ghost lp-tier-cta" type="button" onClick={onRegister}>Boshlash</button>
            </div>
            <div className="lp-tier lp-tier-premium">
              <div className="lp-tier-kicker">Premium</div>
              <h3>Cheksiz</h3>
              <div className="lp-tier-price">10 000 UZS<span className="lp-per"> / 30 kun</span></div>
              <ul>
                <li><span>Kuniga yangi so'zlar</span><span className="lp-val">cheksiz</span></li>
                <li><span>Kunlik limit</span><span className="lp-val">yo'q</span></li>
                <li><span>Test mode</span><span className="lp-val">cheksiz</span></li>
                <li><span>Progress dashboard</span><span className="lp-val">bor</span></li>
                <li><span>Leaderboard</span><span className="lp-val">bor</span></li>
              </ul>
              <button className="lp-btn lp-accent lp-tier-cta" type="button" onClick={onRegister}>Premium olish</button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-finale">
        <div className="lp-wrap">
          <h2>Har kuni ozroq. Lekin to'xtamasdan.</h2>
          <p>10 daqiqa vaqt ajrating: yangi word, pronunciation, example va bitta qisqa test.</p>
          <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Boshlash</button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-footer-colophon">VocabHelper · English vocabulary uchun Telegram Mini App</div>
          <div>@multilevelessays All rights reserved.</div>
        </div>
      </footer>

      <div className="lp-mobile-cta">
        <button type="button" onClick={onRegister}>Boshlash</button>
        <div className="lp-fine">Kuniga 10 ta so'z — abadiy bepul</div>
      </div>
    </main>
  );
}
