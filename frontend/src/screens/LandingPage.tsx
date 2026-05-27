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
            <a href="#promise">Va'da</a>
            <a href="#try">Karta</a>
            <a href="#pricing">Tarif</a>
            <button className="lp-nav-cta" type="button" onClick={onRegister}>Boshlash</button>
          </nav>
        </div>
      </header>

      <div className="lp-masthead">
        <div className="lp-wrap lp-masthead-inner">
          <span>I-jild · №1</span>
          <span>Sokin va izchil mashg'ulot jurnali</span>
          <span>{dateStr}</span>
        </div>
      </div>

      <section className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero-grid">
            <div>
              <div className="lp-eyebrow">Sabrli o'rganuvchi uchun</div>
              <h1 className="lp-headline">Kuniga o'nta so'z. Umrga yetar lug'at.</h1>
              <p className="lp-lede">
                VocabHelper — ingliz tilidagi so'zlarni birma-bir o'rganadigan sokin, tartibli joy.
                Har bir so'zda ona tilingizdagi tarjima, jonli misol va talaffuz bor.
              </p>
              <div className="lp-cta-row">
                <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Hisob ochish</button>
                <button className="lp-btn lp-ghost" type="button" onClick={scrollToTry}>Avval kartani sinab ko'ring</button>
              </div>
              <p className="lp-cta-fine">Kuniga o'n so'zgacha — abadiy bepul. Karta talab qilinmaydi.</p>
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
                <span className="lp-cap-num">1-rasm.</span>Karta — har ertalab shu ko'rinishda.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="lp-promise" id="promise">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <div className="lp-section-label">§ I · Va'da</div>
            <h2 className="lp-section-h2">Har bir o'rganuvchiga beradigan to'rt <em>sokin</em> va'damiz.</h2>
          </div>
          <div className="lp-pillars">
            <article className="lp-pillar">
              <div className="lp-pillar-letter">A.</div>
              <h3>Oson o'rganish, izchil o'rganish.</h3>
              <p>Har kuni kichik ulush — o'nta yangi so'z va engil takror — oddiy ertalabga sig'adi. Shoshilishdan ko'ra, har kuni qaytib kelish muhim.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">B.</div>
              <h3>Hamroh o'rganuvchilar bilan birga.</h3>
              <p>Do'stlar va boshqa o'quvchilar bilan sokin reyting jadvali. Yengilgina bellashing, yutuqlaringizni ulashing — va ertaga qaytib kelishga sabab toping.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">D.</div>
              <h3>Tartibli, izchil yo'l.</h3>
              <p>So'zlar daraja va mavzu bo'yicha tartiblangan — tarqoq emas. Qayerdan boshlaganingiz, qayerdaligingiz va keyingi qadamingiz har doim aniq.</p>
            </article>
            <article className="lp-pillar">
              <div className="lp-pillar-letter">F.</div>
              <h3>Ortiqcha shovqin va yuk yo'q.</h3>
              <p>Bir ekran, bir karta, bir savol: <em>bildimmi?</em> Qolgani — takror, misol, talaffuz — orqa fonda o'z-o'zidan bo'ladi.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-try" id="try" ref={tryRef}>
        <div className="lp-wrap">
          <div className="lp-try-grid">
            <div className="lp-try-copy">
              <div className="lp-section-label" style={{ marginBottom: "24px" }}>§ II · Namuna karta</div>
              <h2>Karta <em>— usulning o'zi.</em></h2>
              <p>
                So'z paydo bo'ladi. Talaffuzini eshitasiz. Ma'nosini eslashga urinasiz.
                Kartani aylantirasiz — va boshqa tomonida ingliz tilidagi izoh, o'zbekcha tarjima
                va so'z ishlatilgan misol turibdi.
              </p>
              <ul className="lp-try-list">
                <li><span className="lp-n">i.</span><span>Karta ustiga bosing — ma'no, tarjima va misol ko'rinadi.</span></li>
                <li><span className="lp-n">ii.</span><span>Kichik <strong>♪</strong> tugmasini bossangiz, so'zni ona tilida so'zlovchi talaffuz qiladi.</span></li>
                <li><span className="lp-n">iii.</span><span>Tayyor bo'lganingizda, o'rgangan so'zlaringiz bo'yicha qisqa test ishlang.</span></li>
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
                <button className="lp-icon-btn" type="button" onClick={() => setFlipped((f) => !f)}>Kartani aylantiring</button>
                <button className="lp-icon-btn" type="button" onClick={onRegister}>Hisob ochish</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-pull">
        <div className="lp-wrap">
          <div className="lp-pull-mark">"</div>
          <blockquote>Tomchi-tomchi yig'ilib, <span className="lp-rom">daryo bo'ladi.</span></blockquote>
          <div className="lp-pull-attribution">§ O'zbek xalq maqoli · VocabHelper tamoyili</div>
        </div>
      </section>

      <section className="lp-pricing" id="pricing">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <div className="lp-section-label">§ III · Obuna</div>
            <h2 className="lp-section-h2">Chinakam bepul. Yoki chanqoqlar uchun <em>cheksiz</em>.</h2>
          </div>
          <div className="lp-price-grid">
            <div className="lp-tier">
              <div className="lp-tier-kicker">Qiroatxona</div>
              <h3>Bepul</h3>
              <div className="lp-tier-price">$0<span className="lp-per"> / abadiy</span></div>
              <ul>
                <li><span>Kuniga yangi so'zlar</span><span className="lp-val">10 tagacha</span></li>
                <li><span>Talaffuz (audio)</span><span className="lp-val">bor</span></li>
                <li><span>Tarjima va misollar</span><span className="lp-val">bor</span></li>
                <li><span>Test rejimi</span><span className="lp-val">bor</span></li>
                <li><span>Dashbord va do'stlar</span><span className="lp-val">bor</span></li>
              </ul>
              <button className="lp-btn lp-ghost lp-tier-cta" type="button" onClick={onRegister}>O'qishni boshlash</button>
            </div>
            <div className="lp-tier lp-tier-premium">
              <div className="lp-tier-kicker">Shaxsiy kutubxona</div>
              <h3>Cheksiz</h3>
              <div className="lp-tier-price">$4<span className="lp-per"> / oyiga</span></div>
              <ul>
                <li><span>Kuniga yangi so'zlar</span><span className="lp-val">cheksiz</span></li>
                <li><span>O'z to'plamlaringiz</span><span className="lp-val">bor</span></li>
                <li><span>Oflayn takror</span><span className="lp-val">bor</span></li>
                <li><span>Batafsil hisobotlar</span><span className="lp-val">bor</span></li>
                <li><span>Turnir va klublar</span><span className="lp-val">bor</span></li>
              </ul>
              <button className="lp-btn lp-accent lp-tier-cta" type="button" onClick={onRegister}>Cheksiz boshlash</button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-finale">
        <div className="lp-wrap">
          <h2>Bugun boshlang. <em>Bir kichik qadam</em> — kechagidan ko'proq.</h2>
          <p>Bepul hisob oching, birinchi kartangizni torting — qolganini ertangi kun hal qiladi.</p>
          <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Hisobimni ochish</button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-footer-colophon">VocabHelper · Times New Roman shriftida terilgan · Har ertalab sokin chop etiladi.</div>
          <div>© MMXXVI · Barcha huquqlar himoyalangan.</div>
        </div>
      </footer>

      <div className="lp-mobile-cta">
        <button type="button" onClick={onRegister}>Bepul hisob ochish</button>
        <div className="lp-fine">Kuniga 10 ta so'z — abadiy bepul</div>
      </div>
    </main>
  );
}
