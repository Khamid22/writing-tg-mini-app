import type { LearnerState, TelegramWebApp, WordProgress } from "./types";

const STORAGE_KEY = "uzbek-words-mini-app-state";

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function telegramUser() {
  const webApp: TelegramWebApp | undefined = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const fallbackName = "Learner";
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return {
    displayName: displayName || user?.username || fallbackName,
    username: user?.username || "telegram_user",
  };
}

export function createInitialState(): LearnerState {
  const user = telegramUser();

  return {
    displayName: user.displayName,
    username: user.username,
    tier: "free",
    selectedLevel: "A1",
    preferredTopic: undefined,
    levelProgress: [],
    uzbekScript: "latin",
    progress: {},
    dailyUsage: {},
  };
}

export function loadState(): LearnerState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();

  try {
    return { ...createInitialState(), ...(JSON.parse(raw) as LearnerState) };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: LearnerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTodayKey(): string {
  return todayKey();
}

export function dailyUsed(state: LearnerState): number {
  return state.dailyUsage[todayKey()] ?? 0;
}

export function emptyProgress(): WordProgress {
  return {
    status: "new",
    mastery: 0,
    isBookmarked: false,
    seen: 0,
    listened: 0,
    flipped: 0,
    answered: 0,
    correct: 0,
  };
}
