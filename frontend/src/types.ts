export type Tier = "free" | "paid";
export type UzbekScriptPreference = "latin" | "cyrillic";
export type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotificationType = "error" | "success" | "warning";

export type Word = {
  id: number;
  word: string;
  wordType: string;
  phonetic: string;
  englishDefinition: string;
  uzbekDefinition: string;
  englishExample: string;
  uzbekExample: string;
  level: string;
};

export type WordProgress = {
  status: "new" | "seen" | "learning" | "learned" | "mastered";
  mastery: number;
  isBookmarked: boolean;
  seen: number;
  listened: number;
  flipped: number;
  answered: number;
  correct: number;
  learnedAt?: string;
  lastReviewedAt?: string;
};

export type LearnerState = {
  userId?: number;
  displayName: string;
  username: string;
  tier: Tier;
  premiumUntil?: string;
  paymentRequest?: PaymentRequest;
  streak: number;
  lastLearningDate?: string;
  activeCollection?: string | null;
  selectedLevel: string;
  preferredTopic?: string | null;
  uzbekScript: UzbekScriptPreference;
  levelProgress: Array<{
    level: string;
    total: number;
    learned: number;
    unlock_at: number;
    is_unlocked: boolean;
  }>;
  progress: Record<number, WordProgress>;
  dailyUsage: Record<string, number>;
  quizHistory: Array<{
    id: string;
    date: string;
    score: number;
    total: number;
  }>;
};

export type PaymentRequest = {
  code: string;
  status: "pending" | "submitted" | "approved" | "cancelled" | "expired";
  amountUzs: number;
  planDays: number;
  cardLabel: string;
  expiresAt: string;
  instructions: string[];
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  wordId: number;
  prompt: string;
  choices: string[];
  answer: string;
};

export type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent?: (eventType: string, eventHandler: () => void) => void;
  offEvent?: (eventType: string, eventHandler: () => void) => void;
  HapticFeedback?: {
    impactOccurred?: (style: HapticImpactStyle) => void;
    notificationOccurred?: (type: HapticNotificationType) => void;
    selectionChanged?: () => void;
  };
  initData?: string;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  contentSafeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
