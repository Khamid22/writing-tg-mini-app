import { useState } from "react";
import type { JSX } from "react";
import { ChevronRight, GraduationCap, RotateCcw } from "lucide-react";
import { emptyProgress } from "../storage";
import type { LearnerState, QuizQuestion } from "../types";
import { buildQuiz } from "../helpers";

export function TestScreen({
  state,
  updateState,
}: {
  state: LearnerState;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
}): JSX.Element {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => buildQuiz(state));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const current = questions[currentIndex];
  const completed = currentIndex >= questions.length;

  function restart(): void {
    setQuestions(buildQuiz(state));
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
  }

  function answer(choice: string): void {
    if (selected || !current) return;
    const correct = choice === current.answer;
    setSelected(choice);
    if (correct) setScore((value) => value + 1);
    updateState((existing) => {
      const progress = existing.progress[current.wordId] ?? emptyProgress();
      const nextMastery = Math.min(100, progress.mastery + (correct ? 15 : 3));
      return {
        ...existing,
        progress: {
          ...existing.progress,
          [current.wordId]: {
            ...progress,
            answered: progress.answered + 1,
            correct: progress.correct + (correct ? 1 : 0),
            mastery: nextMastery,
            status: nextMastery >= 80 ? "mastered" : progress.status === "new" ? "learning" : progress.status,
            lastReviewedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function next(): void {
    if (currentIndex + 1 >= questions.length) {
      updateState((existing) => ({
        ...existing,
        quizHistory: [
          ...existing.quizHistory,
          {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            score,
            total: questions.length,
          },
        ],
      }));
    }
    setSelected(null);
    setCurrentIndex((value) => value + 1);
  }

  if (questions.length === 0) {
    return (
      <section className="empty-panel">
        <GraduationCap size={28} />
        <h2>Hali so'z o'rganilmadi</h2>
        <p>Birinchi so'zni o'rganganingizdan keyin testlar paydo bo'ladi.</p>
      </section>
    );
  }

  if (completed) {
    return (
      <section className="result-panel">
        <div className="score-circle">
          {score}/{questions.length}
        </div>
        <h2>Test yakunlandi</h2>
        <p>{Math.round((score / questions.length) * 100)}% aniqlik</p>
        <button className="primary-button wide" type="button" onClick={restart}>
          <RotateCcw size={16} /> Yangi test
        </button>
      </section>
    );
  }

  return (
    <section className="test-layout">
      <div className="question-count">
        <span>Savol {currentIndex + 1}</span>
        <strong>
          {currentIndex + 1}/{questions.length}
        </strong>
      </div>
      <h2>{current.prompt}</h2>
      <div className="choices">
        {current.choices.map((choice) => {
          const isCorrect = selected && choice === current.answer;
          const isWrong = selected === choice && choice !== current.answer;
          return (
            <button
              className="choice-button"
              data-correct={isCorrect}
              data-wrong={isWrong}
              disabled={Boolean(selected)}
              key={choice}
              onClick={() => answer(choice)}
              type="button"
            >
              <span>{choice}</span>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
      {selected ? (
        <button className="primary-button wide" type="button" onClick={next}>
          Davom etish
        </button>
      ) : null}
    </section>
  );
}
