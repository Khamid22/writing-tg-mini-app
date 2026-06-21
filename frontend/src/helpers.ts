import type { LearnerState } from "./types";

export function countLearned(progress: LearnerState["progress"]): number {
  return Object.values(progress).filter((item) => item.status === "learned" || item.status === "mastered").length;
}
