import type { JSX } from "react";
import type { HTMLMotionProps } from "motion/react";
import { motion, useReducedMotion } from "motion/react";

const features = ["Levels", "Topics", "Flashcards", "Test"];

export function LandingPage({ onRegister }: { onRegister: () => void }): JSX.Element {
  const reduce = useReducedMotion();
  const itemMotion: HTMLMotionProps<"div"> = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { type: "spring", stiffness: 360, damping: 34 },
      };

  return (
    <main className="lp-shell lp-compact-shell">
      <motion.section
        className="lp-intro-panel"
        initial={reduce ? false : { opacity: 0, scale: 0.985 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
      >
        <header className="lp-compact-top">
          <div className="lp-brand"><span className="lp-vh">Vocab</span>·<em>Helper</em></div>
          <button className="lp-nav-cta" type="button" onClick={onRegister}>Ro'yxatdan o'tish</button>
        </header>

        <motion.div className="lp-compact-copy" {...itemMotion}>
          <span className="lp-compact-kicker">Telegram Mini App</span>
          <h1>English vocabulary for daily progress.</h1>
          <p>Daraja tanlang, mavzu tanlang, kartalar bilan yangi so'zlarni mustahkamlang.</p>
        </motion.div>

        <motion.div className="lp-feature-strip" {...itemMotion} transition={reduce ? { duration: 0 } : { delay: 0.05, type: "spring", stiffness: 360, damping: 34 }}>
          {features.map((feature) => <span key={feature}>{feature}</span>)}
        </motion.div>

        <motion.div className="lp-plan-row" {...itemMotion} transition={reduce ? { duration: 0 } : { delay: 0.1, type: "spring", stiffness: 360, damping: 34 }}>
          <div className="lp-plan-card">
            <span>Free</span>
            <strong>10 words/day</strong>
            <em>Pronunciation · Test · Progress</em>
          </div>
          <div className="lp-plan-card premium">
            <span>Premium</span>
            <strong>Unlimited</strong>
            <em>10 000 UZS / 30 kun</em>
          </div>
        </motion.div>

        <motion.div className="lp-compact-action" {...itemMotion} transition={reduce ? { duration: 0 } : { delay: 0.15, type: "spring", stiffness: 360, damping: 34 }}>
          <button className="lp-btn lp-accent" type="button" onClick={onRegister}>Boshlash</button>
          <span>@multilevelessays All rights reserved.</span>
        </motion.div>
      </motion.section>
    </main>
  );
}
