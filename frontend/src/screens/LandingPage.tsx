import type { JSX } from "react";

export function LandingPage({ onRegister }: { onRegister: () => void }): JSX.Element {
  return (
    <main className="lp-shell">
      <header className="lp-topbar">
        <div className="lp-wrap lp-topbar-inner">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <nav className="lp-nav">
            <a href="#plans">Tariflar</a>
            <button className="lp-nav-cta" type="button" onClick={onRegister}>Ro'yxatdan o'tish</button>
          </nav>
        </div>
      </header>

      <section className="lp-hero simple">
        <div className="lp-wrap">
          <div className="lp-hero-grid simple">
            <div>
              <div className="lp-eyebrow">Telegram Mini App</div>
              <h1 className="lp-headline">English vocabulary, tartibli va sodda.</h1>
              <p className="lp-lede">
                Daraja tanlang, mavzu tanlang, kartalar bilan o'rganing.
              </p>
              <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Ro'yxatdan o'tish</button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-pricing" id="plans">
        <div className="lp-wrap">
          <div className="lp-section-head compact">
            <div className="lp-section-label">Tariflar</div>
            <h2 className="lp-section-h2">Ikki plan.</h2>
          </div>
          <div className="lp-price-grid">
            <div className="lp-tier">
              <div className="lp-tier-kicker">Free</div>
              <h3>Bepul</h3>
              <div className="lp-tier-price">0 UZS<span className="lp-per"> / doimiy</span></div>
              <ul>
                <li><span>Kunlik yangi so'zlar</span><span className="lp-val">10 tagacha</span></li>
                <li><span>Pronunciation</span><span className="lp-val">bor</span></li>
                <li><span>Test</span><span className="lp-val">bor</span></li>
              </ul>
            </div>
            <div className="lp-tier lp-tier-premium">
              <div className="lp-tier-kicker">Premium</div>
              <h3>Cheksiz</h3>
              <div className="lp-tier-price">10 000 UZS<span className="lp-per"> / 30 kun</span></div>
              <ul>
                <li><span>Kunlik yangi so'zlar</span><span className="lp-val">cheksiz</span></li>
                <li><span>Review va test</span><span className="lp-val">cheksiz</span></li>
                <li><span>Progress</span><span className="lp-val">bor</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div>@multilevelessays All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}
