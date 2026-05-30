import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Flag, Flame, RotateCcw, Star, X } from "lucide-react";
import type { ApiLimit, ApiWord, WordEvent, WordReportReason } from "../api";
import { fetchTodayWord, fetchTopics, reportWord, sendWordEvent, updatePreferences } from "../api";
import { pronounceWord } from "../audio";
import { playSound } from "../soundSystem";
import { hapticNotify, hapticSelection } from "../haptics";
import { getTodayKey } from "../storage";
import type { LearnerState } from "../types";
import { spring, tapScale } from "../uiMotion";

const LEVEL_ROADMAP = [
  { code: "A1", label: "Beginner" },
  { code: "A2", label: "Elementary" },
  { code: "B1", label: "Pre-Intermediate" },
  { code: "B2", label: "Intermediate" },
  { code: "C1", label: "Advanced" },
  { code: "C2", label: "Proficient" },
];

function topicLabel(topic: string | null | undefined): string {
  if (!topic) return "Barchasi";
  return topic.toLowerCase() === "general" ? "Umumiy" : topic;
}

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNotice, setReportNotice] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const [audioFeedback, setAudioFeedback] = useState("");
  const [topics, setTopics] = useState<Array<{ topic: string; count: number }>>([]);
  const [lastUndo, setLastUndo] = useState<{ wordId: number; label: string; level: string } | null>(null);
  const fetching = useRef(false);
  const reduce = useReducedMotion();
  const feedbackTimer = useRef<number | null>(null);

  function syncLimitToState(lim: ApiLimit): void {
    updateState((current) => ({
      ...current,
      tier: lim.tier as LearnerState["tier"],
      dailyUsage: { ...current.dailyUsage, [getTodayKey()]: lim.daily_used },
    }));
  }

  const activeCollection = state.activeCollection ?? null;
  const activeTopic = state.preferredTopic ?? null;
  const topicChosen = activeTopic !== undefined;

  // Silent fetch: keeps the current card mounted so CSS transitions survive
  function fetchNext(initial = false): void {
    if (fetching.current) return;
    fetching.current = true;
    fetchTodayWord(activeCollection, activeTopic)
      .then(({ item, is_review, limit: newLimit }) => {
        setWord(item);
        setIsReview(is_review);
        setLimit(newLimit);
        syncLimitToState(newLimit);
        if (initial) setInitialLoading(false);
        setFlipped(false);
        setFlipTurn(0);
        setReportOpen(false);
        setReportNotice("");
        setAudioFeedback("");
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
  }, [apiToken, activeCollection, activeTopic]);

  useEffect(() => {
    if (!apiToken) return;
    fetchTopics().then((res) => setTopics(res.items.slice(0, 8))).catch(() => setTopics([]));
  }, [apiToken]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    };
  }, []);

  function showFeedback(message: string): void {
    setActionFeedback(message);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setActionFeedback(""), 1600);
  }

  function recordEvent(eventName: WordEvent): void {
    if (!word) return;
    const targetWord = word;
    sendWordEvent(word.id, eventName)
      .then(({ progress, limit: newLimit }) => {
        setLimit(newLimit);
        syncLimitToState(newLimit);
        // Backend is the source of truth: it already avoids counting review actions as
        // newly learned, so we can always sync the returned status/mastery.
        updateState((current) => {
          const previous = current.progress[targetWord.id];
          const wasLearned = previous?.status === "learned" || previous?.status === "mastered";
          const nextStatus = progress.status as LearnerState["progress"][number]["status"];
          const isNowLearned = nextStatus === "learned" || nextStatus === "mastered";
          const learnedDelta = eventName === "learned" && !wasLearned && isNowLearned ? 1 : 0;
          return {
            ...current,
            levelProgress: learnedDelta
              ? current.levelProgress.map((item) => item.level === targetWord.level ? { ...item, learned: item.learned + 1 } : item)
              : current.levelProgress,
            progress: {
              ...current.progress,
              [targetWord.id]: {
                ...(previous ?? {
                  status: "new", mastery: 0, isBookmarked: false, seen: 0, listened: 0, flipped: 0, answered: 0, correct: 0,
                }),
                status: nextStatus,
                mastery: progress.mastery_score,
                isBookmarked: progress.is_bookmarked,
              },
            },
          };
        });
        if (eventName === "learned") { setLastUndo({ wordId: targetWord.id, label: targetWord.word, level: targetWord.level }); showFeedback("+1 o'rganildi"); playSound("learned"); hapticNotify("success"); }
        if (eventName === "practice_later") { showFeedback("Keyingi karta"); playSound("skip"); hapticSelection(); }
        if (eventName === "remembered") { showFeedback("Takrorlash yangilandi"); playSound("correct"); hapticNotify("success"); }
        if (eventName === "forgot") { showFeedback("Qiyin deb belgilandi"); playSound("wrong"); hapticNotify("warning"); }
        if (eventName === "bookmark" || eventName === "unbookmark") { showFeedback(eventName === "bookmark" ? "Saqlab qo'yildi" : "Saqlanganlardan olindi"); hapticSelection(); return; }
        if (eventName === "undo_learned") { setLastUndo(null); showFeedback("Bekor qilindi"); fetchNext(); return; }
        if (eventName === "learned" || eventName === "practice_later" || eventName === "remembered" || eventName === "forgot") {
          fetchNext(); // silent — card stays mounted until next word arrives
        }
      })
      .catch(() => {});
  }

  async function speak(): Promise<void> {
    if (!word) return;
    setAudioFeedback("Yuklanmoqda...");
    recordEvent("listened");
    const result = await pronounceWord({ id: word.id, word: word.word, audioUrl: word.audio_url });
    setAudioFeedback(
      result === "audio"
        ? "Tinglanmoqda"
        : result === "fallback"
          ? "Telefon ovozi ishlatyapti"
          : "Audio topilmadi",
    );
    window.setTimeout(() => setAudioFeedback(""), 1800);
  }

  function flip(): void {
    if (!word) return;
    setFlipped((v) => !v);
    setFlipTurn((turn) => turn + 1);
    if (!flipped) recordEvent("flipped");
  }

  async function submitReport(reason: WordReportReason): Promise<void> {
    if (!word) return;
    setReportNotice("");
    try {
      await reportWord(word.id, reason);
      setReportNotice("Rahmat. Admin bu kartani tekshiradi.");
      setReportOpen(false);
    } catch {
      setReportNotice("Xabar yuborilmadi. Keyinroq urinib ko'ring.");
    }
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

  const currentLevelIndex = Math.max(0, LEVEL_ROADMAP.findIndex((level) => level.code === word.level.toUpperCase()));
  const currentLevel = LEVEL_ROADMAP[currentLevelIndex] ?? LEVEL_ROADMAP[0];
  const nextLevel = LEVEL_ROADMAP[currentLevelIndex + 1];
  const levelStats = state.levelProgress.find((item) => item.level === currentLevel.code);
  const learnedInLevel = levelStats?.learned ?? 0;
  const unlockAt = levelStats?.unlock_at ?? 0;
  const roadmapText = unlockAt > 0
    ? `${learnedInLevel}/${unlockAt} · keyingi bosqich`
    : nextLevel ? `Keyingi: ${nextLevel.label}` : "Final bosqich";
  const isBookmarked = Boolean(state.progress[word.id]?.isBookmarked);

  function chooseTopic(topic: string | null | undefined): void {
    updateState((current) => ({ ...current, preferredTopic: topic }));
    updatePreferences({ preferred_topic: topic }).catch(() => {});
  }

  function undoLast(): void {
    if (!lastUndo) return;
    sendWordEvent(lastUndo.wordId, "undo_learned")
      .then(({ progress, limit: newLimit }) => {
        setLimit(newLimit);
        syncLimitToState(newLimit);
        updateState((current) => ({
          ...current,
          levelProgress: current.levelProgress.map((item) => item.level === lastUndo.level ? { ...item, learned: Math.max(0, item.learned - 1) } : item),
          progress: {
            ...current.progress,
            [lastUndo.wordId]: {
              ...(current.progress[lastUndo.wordId] ?? {
                status: "new", mastery: 0, isBookmarked: false, seen: 0, listened: 0, flipped: 0, answered: 0, correct: 0,
              }),
              status: progress.status as LearnerState["progress"][number]["status"],
              mastery: progress.mastery_score,
              isBookmarked: progress.is_bookmarked,
            },
          },
        }));
        setLastUndo(null);
        showFeedback("Oxirgi belgi bekor qilindi");
      })
      .catch(() => {});
  }

  if (!topicChosen) {
    return (
      <section className="topic-select-screen">
        <div className="topic-select-head">
          <span>Avval mavzu tanlang</span>
          <h2>Qaysi yo'nalishda mashq qilamiz?</h2>
          <p>Keyin kartalar shu tanlov bo'yicha ochiladi. Xohlasangiz hamma mavzudan aralash o'rganishingiz mumkin.</p>
        </div>
        <div className="topic-select-grid">
          <button type="button" onClick={() => chooseTopic(null)}>
            <strong>Barchasi</strong>
            <span>Hamma mavzudan aralash kartalar</span>
          </button>
          {topics.map((item) => (
            <button type="button" key={item.topic} onClick={() => chooseTopic(item.topic)}>
              <strong>{topicLabel(item.topic)}</strong>
              <span>{item.count} ta karta</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="learn-layout">
      {activeCollection ? (
        <div className="course-chip" aria-label="Active course">
          <span className="course-chip-label">Kurs:</span>
          <strong>{activeCollection}</strong>
        </div>
      ) : null}
      <div className="learn-roadmap" aria-label="Learning roadmap">
        <div className="learn-roadmap-head">
          <span>Yo'l xaritasi</span>
          <strong>{currentLevel.label}</strong>
          <em>{roadmapText}</em>
        </div>
        <div className="level-path">
          {LEVEL_ROADMAP.map((level, index) => (
            <span
              aria-label={`${level.label} ${index < currentLevelIndex ? "completed" : index === currentLevelIndex ? "current" : "locked"}`}
              className="level-dot"
              data-state={index < currentLevelIndex ? "done" : index === currentLevelIndex ? "current" : "locked"}
              key={level.code}
              title={level.label}
            >
              {level.code}
            </span>
          ))}
        </div>
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
          animate={{ rotateY: reduce ? 0 : flipTurn * 180 }}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flashcard-side flashcard-front">
            <div className="flashcard-meta">
              <span>{isReview ? "Takror" : "Karta"} · {word.level}</span>
              <span data-script-lock>{word.word_type}</span>
            </div>
            <div className="flashcard-word-block" data-script-lock>
              <h2>{word.word}</h2>
              <p className="phonetic">{word.phonetic} · {word.word_type}</p>
            </div>
            <div className="flashcard-hint">
              <em>Ma'noni ko'rish uchun bosing.</em>
              <button
                aria-label="Talaffuz"
                className="flashcard-speaker"
                data-sound="off"
                type="button"
                onClick={(e) => { e.stopPropagation(); void speak(); }}
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
                <dd data-script-lock>{word.english_definition}</dd>
                <dt>O'zbekcha</dt>
                <dd>{word.uzbek_definition}</dd>
                <dt>Misol</dt>
                <dd data-script-lock><em>{word.english_example}</em></dd>
                <dt>Tarjima</dt>
                <dd>{word.uzbek_example}</dd>
              </dl>
            </div>
            <div className="flashcard-hint">
              <em>Orqaga qaytarish uchun yana bosing.</em>
              <button
                aria-label="Talaffuz"
                className="flashcard-speaker"
                data-sound="off"
                type="button"
                onClick={(e) => { e.stopPropagation(); void speak(); }}
              >
                ♪
              </button>
            </div>
          </div>
        </motion.div>
      </motion.button>

      <div className="action-row">
        <button aria-label="Muammo haqida xabar berish" className="icon-button" type="button" onClick={() => setReportOpen((v) => !v)}>
          <Flag size={18} />
        </button>
        <button
          aria-label={isBookmarked ? "Saqlanganlardan olish" : "Saqlab qo'yish"}
          className="icon-button"
          data-active={isBookmarked}
          data-sound="off"
          type="button"
          onClick={() => recordEvent(isBookmarked ? "unbookmark" : "bookmark")}
        >
          <Star size={18} />
        </button>
        {isReview ? (
          <>
            <button className="secondary-button" data-sound="off" type="button" onClick={() => recordEvent("forgot")}>
              <X size={16} /> Eslolmadim
            </button>
            <button className="primary-button" data-sound="off" type="button" onClick={() => recordEvent("remembered")}>
              <Check size={16} /> Bilaman
            </button>
          </>
        ) : (
          <>
            <button className="secondary-button" data-sound="off" type="button" onClick={() => recordEvent("practice_later")}>
              Keyingisi
            </button>
            <button className="primary-button" data-sound="off" type="button" onClick={() => recordEvent("learned")}>
              <Check size={16} /> Bilaman
            </button>
          </>
        )}
      </div>
      {reportOpen ? (
        <div className="report-panel">
          <button type="button" onClick={() => void submitReport("too_difficult")}>Juda qiyin</button>
          <button type="button" onClick={() => void submitReport("wrong_meaning")}>Ma'no noto'g'ri</button>
          <button type="button" onClick={() => void submitReport("audio_broken")}>Audio ishlamayapti</button>
          <button type="button" onClick={() => void submitReport("bad_example")}>Misol yaxshi emas</button>
          <button type="button" onClick={() => void submitReport("already_know")}>Bu so'zni bilaman</button>
        </div>
      ) : null}
      {actionFeedback || audioFeedback || lastUndo ? (
        <p className="learn-feedback">
          <span>{actionFeedback || audioFeedback}</span>
          {lastUndo ? (
            <button type="button" data-sound="off" onClick={undoLast}>
              Bekor qilish
            </button>
          ) : null}
        </p>
      ) : null}
      {reportNotice ? <p className="report-notice">{reportNotice}</p> : null}
    </section>
  );
}
