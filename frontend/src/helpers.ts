import { words } from "./data";
import type { LearnerState, QuizQuestion, Word } from "./types";

export function learnedWords(state: LearnerState): Word[] {
  return words
    .filter((word) => {
      const status = state.progress[word.id]?.status;
      return status === "learned" || status === "mastered";
    })
    .reverse();
}

export function findNextWord(state: LearnerState): Word {
  return (
    words.find((word) => {
      const status = state.progress[word.id]?.status;
      return status !== "learned" && status !== "mastered";
    }) ?? words[0]
  );
}

export function buildQuiz(state: LearnerState): QuizQuestion[] {
  const pool = learnedWords(state).slice(0, 8);
  return pool.slice(0, 5).map((word) => {
    const wrongChoices = words
      .filter((item) => item.id !== word.id)
      .map((item) => item.uzbekDefinition)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const choices = [word.uzbekDefinition, ...wrongChoices].sort(() => Math.random() - 0.5);
    return {
      id: `${word.id}-${Date.now()}`,
      wordId: word.id,
      prompt: `"${word.word}" so'zi nimani anglatadi?`,
      choices,
      answer: word.uzbekDefinition,
    };
  });
}

export function userAccuracy(state: LearnerState): number {
  const answered = Object.values(state.progress).reduce((total, item) => total + item.answered, 0);
  const correct = Object.values(state.progress).reduce((total, item) => total + item.correct, 0);
  return answered ? Math.round((correct / answered) * 100) : 0;
}
