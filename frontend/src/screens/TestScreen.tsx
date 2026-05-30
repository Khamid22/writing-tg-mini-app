import { useEffect, useState } from "react";
import type { JSX } from "react";
import { ChevronRight, GraduationCap, RotateCcw } from "lucide-react";
import type { ApiQuestion, AnswerResponse } from "../api";
import { answerTestQuestion, completeTest, startTest } from "../api";
import type { LearnerState } from "../types";

type QuizState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "playing"; attemptId: number; questions: ApiQuestion[]; index: number; selected: string | null; correctAnswer: string | null; score: number }
  | { phase: "done"; score: number; total: number; accuracy: number }
  | { phase: "empty" };

export function TestScreen({
  state,
  updateState,
  apiToken,
}: {
  state: LearnerState;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
  apiToken: string | null;
}): JSX.Element {
  const [quiz, setQuiz] = useState<QuizState>({ phase: "idle" });
  const activeCollection = state.activeCollection ?? null;

  useEffect(() => {
    if (!apiToken) return;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken, activeCollection]);

  function begin(): void {
    setQuiz({ phase: "loading" });
    startTest(5, "learned_words", activeCollection)
      .then(({ attempt, questions }) => {
        if (!attempt.id || questions.length === 0) {
          setQuiz({ phase: "empty" });
          return;
        }
        setQuiz({
          phase: "playing",
          attemptId: attempt.id,
          questions,
          index: 0,
          selected: null,
          correctAnswer: null,
          score: 0,
        });
      })
      .catch(() => setQuiz({ phase: "empty" }));
  }

  function answer(choice: string): void {
    if (quiz.phase !== "playing" || quiz.selected) return;
    const current = quiz.questions[quiz.index];
    answerTestQuestion(quiz.attemptId, current.id, choice)
      .then((res: AnswerResponse) => {
        const newScore = quiz.score + (res.is_correct ? 1 : 0);
        setQuiz({ ...quiz, selected: choice, correctAnswer: res.correct_choice, score: newScore });
        updateState((existing) => ({
          ...existing,
          progress: {
            ...existing.progress,
            [current.word_item_id]: {
              ...(existing.progress[current.word_item_id] ?? {
                status: "new", mastery: 0, seen: 0, listened: 0, flipped: 0, answered: 0, correct: 0,
              }),
              mastery: res.mastery_score,
              answered: (existing.progress[current.word_item_id]?.answered ?? 0) + 1,
              correct: (existing.progress[current.word_item_id]?.correct ?? 0) + (res.is_correct ? 1 : 0),
            },
          },
        }));
      })
      .catch(() => {});
  }

  function next(): void {
    if (quiz.phase !== "playing") return;
    const nextIndex = quiz.index + 1;
    if (nextIndex >= quiz.questions.length) {
      completeTest(quiz.attemptId)
        .then((res) => {
          setQuiz({ phase: "done", score: res.score, total: res.total_questions, accuracy: res.accuracy });
        })
        .catch(() => {
          setQuiz({ phase: "done", score: quiz.score, total: quiz.questions.length, accuracy: Math.round((quiz.score / quiz.questions.length) * 100) });
        });
    } else {
      setQuiz({ ...quiz, index: nextIndex, selected: null, correctAnswer: null });
    }
  }

  if (!apiToken || quiz.phase === "loading") {
    return (
      <section className="empty-panel">
        <p className="muted">Yuklanmoqda...</p>
      </section>
    );
  }

  if (quiz.phase === "empty" || quiz.phase === "idle") {
    return (
      <section className="empty-panel">
        <GraduationCap size={28} />
        <h2>Hali so'z o'rganilmadi</h2>
        <p>Birinchi so'zni o'rganganingizdan keyin testlar paydo bo'ladi.</p>
      </section>
    );
  }

  if (quiz.phase === "done") {
    return (
      <section className="result-panel">
        <div className="score-circle">
          {quiz.score}/{quiz.total}
        </div>
        <h2>Test yakunlandi</h2>
        <p>{quiz.accuracy}% aniqlik</p>
        <button className="primary-button wide" type="button" onClick={begin}>
          <RotateCcw size={16} /> Yangi test
        </button>
      </section>
    );
  }

  const current = quiz.questions[quiz.index];

  return (
    <section className="test-layout">
      {activeCollection ? (
        <div className="course-chip" aria-label="Active course">
          <span className="course-chip-label">Kurs:</span>
          <strong>{activeCollection}</strong>
        </div>
      ) : null}
      <div className="question-count">
        <span>Savol {quiz.index + 1}</span>
        <strong>{quiz.index + 1}/{quiz.questions.length}</strong>
      </div>
      <h2 data-script-lock>{current.prompt}</h2>
      <div className="choices">
        {current.choices.map((choice) => {
          const isCorrect = quiz.selected !== null && choice === quiz.correctAnswer;
          const isWrong = quiz.selected === choice && choice !== quiz.correctAnswer;
          return (
            <button
              className="choice-button"
              data-correct={isCorrect}
              data-wrong={isWrong}
              disabled={quiz.selected !== null}
              key={choice}
              onClick={() => answer(choice)}
              type="button"
            >
              <span data-script-lock>{choice}</span>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
      {quiz.selected !== null ? (
        <button className="primary-button wide" type="button" onClick={next}>
          Davom etish
        </button>
      ) : null}
    </section>
  );
}
