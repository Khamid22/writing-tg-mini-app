import { words } from "./data";
import type { LearnerState, Word } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function learnedWords(state: LearnerState): Word[] {
  return words
    .filter((word) => {
      const status = state.progress[word.id]?.status;
      return status === "learned" || status === "mastered";
    })
    .reverse();
}

export function countLearned(progress: LearnerState["progress"]): number {
  return Object.values(progress).filter((item) => item.status === "learned" || item.status === "mastered").length;
}

export function findNextWord(state: LearnerState): Word {
  return (
    words.find((word) => {
      const status = state.progress[word.id]?.status;
      return status !== "learned" && status !== "mastered";
    }) ?? words[0]
  );
}

export function userAccuracy(state: LearnerState): number {
  const answered = Object.values(state.progress).reduce((total, item) => total + item.answered, 0);
  const correct = Object.values(state.progress).reduce((total, item) => total + item.correct, 0);
  return answered ? Math.round((correct / answered) * 100) : 0;
}

export function buildQuiz(state: LearnerState): Array<{ id: string; wordId: number; prompt: string; choices: string[]; answer: string }> {
  const pool = learnedWords(state).slice(0, 8);
  return pool.slice(0, 5).map((word) => {
    const wrongChoices = shuffle(
      words.filter((item) => item.id !== word.id).map((item) => item.uzbekDefinition),
    ).slice(0, 3);
    const choices = shuffle([word.uzbekDefinition, ...wrongChoices]);
    return {
      id: `${word.id}-${Date.now()}`,
      wordId: word.id,
      prompt: `"${word.word}" so'zi nimani anglatadi?`,
      choices,
      answer: word.uzbekDefinition,
    };
  });
}
