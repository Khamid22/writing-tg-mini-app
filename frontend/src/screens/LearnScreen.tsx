import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Flame, Headphones, RotateCcw, X } from "lucide-react";
import type { ApiLimit, ApiWord, WordEvent } from "../api";
import { fetchTodayWord, sendWordEvent } from "../api";
import { pronounceWord } from "../audio";
import { getTodayKey } from "../storage";
import type { LearnerState } from "../types";
import { spring, tapScale } from "../uiMotion";

export function LearnScreen({
  state,
  updateState,
  apiToken,
}: {
  state: LearnerState;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
  apiToken: string | null;
}): JSX.Element {
  const [word, setWord] = useState<ApiWord | null>(null);
  const [limit, setLimit] = useState<ApiLimit | null>(null);
  const [isReview, setIsReview] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [flipTurn, setFlipTurn] = useState(0);
  const fetching = useRef(false);
  const reduce = useReducedMotion();

  function syncLimitToState(lim: ApiLimit): void {
    updateState((current) => ({
      ...current,
      tier: lim.tier as LearnerState["tier"],
      dailyUsage: { ...current.dailyUsage, [getTodayKey()]: lim.daily_used },
    }));
  }

  const activeCollection = state.activeCollection ?? null;

  // Silent fetch: keeps the current card mounted so CSS transitions survive
  function fetchNext(initial = false): void {
    if (fetching.current) return;
    fetching.current = true;
    fetchTodayWord(activeCollection)
      .then(({ item, is_review, limit: newLimit }) => {
        setWord(item);
        setIsReview(is_review);
        setLimit(newLimit);
        syncLimitToState(newLimit);
        if (initial) setInitialLoading(false);
        setFlipped(false);
        setFlipTurn(0);
      })
      .catch(() => {
        setWord(null);
        setIsReview(false);
        setLimit(null);
        if (initial) setInitialLoading(false);
      })
      .finally(() => {
        fetching.current = false;
      });
  }

  useEffect(() => {
    if (!apiToken) return;
    setInitialLoading(true);
    setWord(null);
    setLimit(null);
    setIsReview(false);
    fetching.current = false;
    fetchNext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken, activeCollection]);

  function recordEvent(eventName: WordEvent): void {
    if (!word) return;
    sendWordEvent(word.id, eventName)
      .then(({ progress, limit: newLimit }) => {
        setLimit(newLimit);
        syncLimitToState(newLimit);
        updateState((current) => ({
          ...current,
          progress: {
            ...current.progress,
            ...(isReview && !current.progress[word.id]
              ? {}
              : {
                  [word.id]: {
                    ...(current.progress[word.id] ?? {
                      status: "new", mastery: 0, seen: 0, listened: 0, flipped: 0, answered: 0, correct: 0,
                    }),
                    status: progress.status as LearnerState["progress"][number]["status"],
                    mastery: progress.mastery_score,
                  },
                }),
          },
        }));
        if (eventName === "learned" || eventName === "practice_later" || eventName === "remembered" || eventName === "forgot") {
          fetchNext(); // silent — card stays mounted until next word arrives
        }
      })
      .catch(() => {});
  }

  function speak(): void {
    if (!word) return;
    recordEvent("listened");
    void pronounceWord({ id: word.id, word: word.word, audioUrl: word.audio_url });
  }

  function flip(): void {
    if (!word) return;
    setFlipped((v) => !v);
    setFlipTurn((turn) => turn + 1);
    if (!flipped) recordEvent("flipped");
  }

  if (!apiToken || initialLoading) {
    return (
      <section className="empty-panel">
        <p className="muted">Ulanmoqda...</p>
      </section>
    );
  }

  if (limit && limit.tier !== "paid" && !limit.can_learn_more && !isReview && !word) {
    return (
      <section className="limit-panel">
        <div className="panel-icon">
          <Flame size={24} />
        </div>
        <h2>Kunlik limit tugadi</h2>
        <p>Bugun {limit?.daily_used ?? 0} ta so'z o'rgandingiz. Mashq qilish ochiq qoladi.</p>
        <div className="two-actions single-action">
          <button className="secondary-button" type="button" onClick={() => setFlipped(false)}>
            <RotateCcw size={16} /> Kartani tiklash
          </button>
        </div>
      </section>
    );
  }

  if (!word || !limit) {
    return (
      <section className="empty-panel">
        <Check size={28} />
        <h2>Hali so'z qo'shilmagan</h2>
        <p>Admin yangi so'zlarni qo'shganidan keyin shu yerda paydo bo'ladi.</p>
      </section>
    );
  }

  const learnedTotal = Object.values(state.progress).filter(
    (p) => p.status === "learned" || p.status === "mastered",
  ).length;

  return (
    <section className="learn-layout">
      {activeCollection ? (
        <div className="course-chip" aria-label="Active course">
          <span className="course-chip-label">Kurs:</span>
          <strong>{activeCollection}</strong>
        </div>
      ) : null}
      <div className="daily-strip">
        <span>
          {isReview
            ? "Takror mashqi · cheksiz"
            : state.tier === "paid"
              ? "Bugun cheksiz so'z"
              : `${limit.daily_remaining} ta bepul so'z qoldi`}
        </span>
        <strong>{learnedTotal} ta o'rganildi</strong>
      </div>

      <motion.button
        key={`${word.id}-${isReview ? "review" : "learn"}`}
        aria-label={flipped ? "So'zni ko'rsatish" : "Ma'noni ko'rsatish"}
        className="flashcard"
        data-flipped={flipped}
        onClick={flip}
        type="button"
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.99 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0 } : spring}
        whileTap={tapScale()}
      >
        <motion.div
          className="flashcard-inner"
          animate={{ rotateY: reduce ? 0 : flipTurn * 540 }}
          transition={reduce ? { duration: 0 } : { duration: 0.64, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flashcard-side flashcard-front">
            <div className="flashcard-meta">
              <span>{isReview ? "Takror" : "Karta"} · {word.level}</span>
              <span>{word.word_type}</span>
            </div>
            <div className="flashcard-word-block">
              <h2>{word.word}</h2>
              <p className="phonetic">{word.phonetic} · {word.word_type}</p>
            </div>
            <div className="flashcard-hint">
              <em>Ma'noni ko'rish uchun bosing.</em>
              <button
                aria-label="Talaffuz"
                className="flashcard-speaker"
                type="button"
                onClick={(e) => { e.stopPropagation(); speak(); }}
              >
                ♪
              </button>
            </div>
          </div>
          <div className="flashcard-side flashcard-back">
            <div className="flashcard-meta">
              <span>Ma'no</span>
              <span>{word.level}</span>
            </div>
            <div className="flashcard-defs">
              <dl>
                <dt>Inglizcha</dt>
                <dd>{word.english_definition}</dd>
                <dt>O'zbekcha</dt>
                <dd>{word.uzbek_definition}</dd>
                <dt>Misol</dt>
                <dd><em>{word.english_example}</em></dd>
                <dt>Tarjima</dt>
                <dd>{word.uzbek_example}</dd>
              </dl>
            </div>
            <div className="flashcard-hint">
              <em>Orqaga qaytarish uchun yana bosing.</em>
              <button
                aria-label="Talaffuz"
                className="flashcard-speaker"
                type="button"
                onClick={(e) => { e.stopPropagation(); speak(); }}
              >
                ♪
              </button>
            </div>
          </div>
        </motion.div>
      </motion.button>

      <div className="action-row">
        <button aria-label="Tinglash" className="icon-button" type="button" onClick={speak}>
          <Headphones size={20} />
        </button>
        {isReview ? (
          <>
            <button className="secondary-button" type="button" onClick={() => recordEvent("forgot")}>
              <X size={16} /> Eslolmadim
            </button>
            <button className="primary-button" type="button" onClick={() => recordEvent("remembered")}>
              <Check size={16} /> Bilaman
            </button>
          </>
        ) : (
          <>
            <button className="secondary-button" type="button" onClick={() => recordEvent("practice_later")}>
              Keyinroq
            </button>
            <button className="primary-button" type="button" onClick={() => recordEvent("learned")}>
              <Check size={16} /> O'rgandim
            </button>
          </>
        )}
      </div>
    </section>
  );
}
