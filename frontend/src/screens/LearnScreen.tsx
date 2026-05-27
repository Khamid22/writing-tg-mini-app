import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Check, Flame, Headphones, RotateCcw } from "lucide-react";
import { DAILY_FREE_LIMIT } from "../data";
import { canLearnMore, dailyRemaining, emptyProgress, getTodayKey } from "../storage";
import type { LearnerState, Word } from "../types";
import { findNextWord, learnedWords } from "../helpers";

export function LearnScreen({
  state,
  updateState,
}: {
  state: LearnerState;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
}): JSX.Element {
  const [flipped, setFlipped] = useState(false);
  const nextWord = useMemo(() => findNextWord(state), [state]);
  const learnedTotal = learnedWords(state).length;
  const remaining = dailyRemaining(state);
  const limitReached = !canLearnMore(state);

  function recordEvent(word: Word, event: "seen" | "listened" | "flipped" | "learned" | "practice_later"): void {
    updateState((current) => {
      const today = getTodayKey();
      const progress = current.progress[word.id] ?? emptyProgress();
      const next = {
        ...progress,
        seen: progress.seen + (event === "seen" ? 1 : 0),
        listened: progress.listened + (event === "listened" ? 1 : 0),
        flipped: progress.flipped + (event === "flipped" ? 1 : 0),
      };

      if (event === "flipped" && next.status === "new") {
        next.status = "seen";
        next.mastery = Math.max(next.mastery, 5);
      }

      if (event === "practice_later") {
        next.status = "learning";
        next.mastery = Math.max(next.mastery, 10);
      }

      if (event === "learned") {
        if (current.tier === "free" && (current.dailyUsage[today] ?? 0) >= DAILY_FREE_LIMIT && next.status !== "learned") {
          return current;
        }
        const wasLearned = next.status === "learned" || next.status === "mastered";
        next.status = "learned";
        next.mastery = Math.max(next.mastery, 25);
        next.learnedAt = next.learnedAt ?? new Date().toISOString();
        return {
          ...current,
          streak: current.lastLearningDate === today ? current.streak : current.streak + 1,
          lastLearningDate: today,
          progress: { ...current.progress, [word.id]: next },
          dailyUsage: {
            ...current.dailyUsage,
            [today]: (current.dailyUsage[today] ?? 0) + (wasLearned ? 0 : 1),
          },
        };
      }

      return { ...current, progress: { ...current.progress, [word.id]: next } };
    });
  }

  function speak(word: Word): void {
    recordEvent(word, "listened");
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-GB";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function flip(word: Word): void {
    setFlipped((value) => !value);
    if (!flipped) recordEvent(word, "flipped");
  }

  if (limitReached) {
    return (
      <section className="limit-panel">
        <div className="panel-icon">
          <Flame size={24} />
        </div>
        <h2>Kunlik limit tugadi</h2>
        <p>Bugun 10 ta so'z o'rgandingiz. Mashq qilish ochiq qoladi.</p>
        <div className="two-actions single-action">
          <button className="secondary-button" type="button" onClick={() => setFlipped(false)}>
            <RotateCcw size={16} /> Kartani tiklash
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="learn-layout">
      <div className="daily-strip">
        <span>{state.tier === "paid" ? "Bugun cheksiz so'z" : `${remaining} ta bepul so'z qoldi`}</span>
        <strong>{learnedTotal} ta o'rganildi</strong>
      </div>

      <button
        aria-label={flipped ? "So'zni ko'rsatish" : "Ma'noni ko'rsatish"}
        className="flashcard"
        data-flipped={flipped}
        onClick={() => flip(nextWord)}
        type="button"
      >
        <div className="flashcard-side flashcard-front">
          <div className="flashcard-meta">
            <span>Karta · {nextWord.level}</span>
            <span>{nextWord.wordType}</span>
          </div>
          <div className="flashcard-word-block">
            <h2>{nextWord.word}</h2>
            <p className="phonetic">{nextWord.phonetic} · {nextWord.wordType}</p>
          </div>
          <div className="flashcard-hint">
            <em>Ma'noni ko'rish uchun bosing.</em>
            <button
              aria-label="Talaffuz"
              className="flashcard-speaker"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                speak(nextWord);
              }}
            >
              ♪
            </button>
          </div>
        </div>
        <div className="flashcard-side flashcard-back">
          <div className="flashcard-meta">
            <span>Ma'no</span>
            <span>{nextWord.level}</span>
          </div>
          <div className="flashcard-defs">
            <dl>
              <dt>Inglizcha</dt>
              <dd>{nextWord.englishDefinition}</dd>
              <dt>O'zbekcha</dt>
              <dd>{nextWord.uzbekDefinition}</dd>
              <dt>Misol</dt>
              <dd><em>{nextWord.englishExample}</em></dd>
              <dt>Tarjima</dt>
              <dd>{nextWord.uzbekExample}</dd>
            </dl>
          </div>
          <div className="flashcard-hint">
            <em>Orqaga qaytarish uchun yana bosing.</em>
            <button
              aria-label="Talaffuz"
              className="flashcard-speaker"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                speak(nextWord);
              }}
            >
              ♪
            </button>
          </div>
        </div>
      </button>

      <div className="action-row">
        <button aria-label="Tinglash" className="icon-button" type="button" onClick={() => speak(nextWord)}>
          <Headphones size={20} />
        </button>
        <button className="secondary-button" type="button" onClick={() => recordEvent(nextWord, "practice_later")}>
          Keyinroq
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            recordEvent(nextWord, "learned");
            setFlipped(false);
          }}
        >
          <Check size={16} /> O'rgandim
        </button>
      </div>
    </section>
  );
}
