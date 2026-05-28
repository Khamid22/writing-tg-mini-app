import type { LearnerState, PaymentRequest } from "./types";

const TOKEN_KEY = "uzbek-words-api-token";

export type ApiUser = {
  id: number;
  display_name: string;
  username: string | null;
  tier: LearnerState["tier"];
  premium_until: string | null;
};

export type ApiLimit = {
  tier: string;
  daily_limit: number | null;
  daily_used: number;
  daily_remaining: number | null;
  can_learn_more: boolean;
};

export type ApiWord = {
  id: number;
  word: string;
  word_type: string;
  phonetic: string;
  english_definition: string;
  uzbek_definition: string;
  english_example: string;
  uzbek_example: string;
  level: string;
  topic: string;
  collection: string;
  tags: string;
  collocations: string;
  common_mistake: string;
  writing_prompt: string;
  difficulty_order: number;
  audio_url: string | null;
};

export type TodayWordResponse = {
  item: ApiWord | null;
  limit: ApiLimit;
};

export type WordEventResponse = {
  ok: boolean;
  progress: { status: string; mastery_score: number };
  limit: ApiLimit;
};

export type ApiQuestion = {
  id: string;
  word_item_id: number;
  type: string;
  prompt: string;
  choices: string[];
};

export type StartTestResponse = {
  attempt: { id: number | null; total_questions: number };
  questions: ApiQuestion[];
};

export type AnswerResponse = {
  is_correct: boolean;
  correct_choice: string;
  mastery_score: number;
};

export type CompleteTestResponse = {
  score: number;
  total_questions: number;
  accuracy: number;
};

export type ApiDashboardStats = {
  learned_total: number;
  learned_today: number;
  daily_limit: number | null;
  daily_remaining: number | null;
  streak_days: number;
  quiz_accuracy: number;
  mastered_total: number;
};

export type DashboardResponse = {
  stats: ApiDashboardStats;
  recent_words: ApiWord[];
};

export type LeaderboardItem = {
  rank: number;
  user_id: number;
  display_name: string;
  username: string | null;
  points: number;
  learned_total: number;
};

export type LeaderboardResponse = {
  period: string;
  items: LeaderboardItem[];
};

export type PublicProfileResponse = {
  user: { id: number; display_name: string; username: string | null };
  stats: { learned_total: number; mastered_total: number; streak_days: number; total_points: number };
  recent_words: ApiWord[];
};

type AuthResponse = {
  user: ApiUser;
  token: string;
};

type ManualPaymentResponse = {
  code: string;
  status: PaymentRequest["status"];
  plan_days: number;
  amount_uzs: number;
  card_label: string;
  expires_at: string;
  instructions: string[];
};

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }
  return "";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function applyApiUser(state: LearnerState, user: ApiUser): LearnerState {
  return {
    ...state,
    userId: user.id,
    displayName: user.display_name || state.displayName,
    username: user.username || state.username,
    tier: user.tier,
    premiumUntil: user.premium_until ?? undefined,
  };
}

export async function authenticateTelegram(initData: string): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/api/mini/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ init_data: initData }),
  });
  localStorage.setItem(TOKEN_KEY, response.token);
  return response;
}

export async function fetchTodayWord(): Promise<TodayWordResponse> {
  return apiFetch<TodayWordResponse>("/api/mini/words/today");
}

export async function sendWordEvent(wordId: number, event: string): Promise<WordEventResponse> {
  return apiFetch<WordEventResponse>(`/api/mini/words/${wordId}/events`, {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}

export async function startTest(questionCount: number = 5, mode: string = "learned_words"): Promise<StartTestResponse> {
  return apiFetch<StartTestResponse>("/api/mini/tests/start", {
    method: "POST",
    body: JSON.stringify({ question_count: questionCount, mode }),
  });
}

export async function answerTestQuestion(
  attemptId: number,
  questionId: string,
  selectedChoice: string,
): Promise<AnswerResponse> {
  return apiFetch<AnswerResponse>(`/api/mini/tests/${attemptId}/answer`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, selected_choice: selectedChoice }),
  });
}

export async function completeTest(attemptId: number): Promise<CompleteTestResponse> {
  return apiFetch<CompleteTestResponse>(`/api/mini/tests/${attemptId}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/api/mini/dashboard");
}

export async function fetchLeaderboard(period: string = "weekly"): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/api/mini/leaderboard?period=${period}`);
}

export async function fetchPublicProfile(userId: number): Promise<PublicProfileResponse> {
  return apiFetch<PublicProfileResponse>(`/api/mini/users/${userId}`);
}

export function mapPaymentResponse(payment: ManualPaymentResponse): PaymentRequest {
  return {
    code: payment.code,
    status: payment.status,
    amountUzs: payment.amount_uzs,
    planDays: payment.plan_days,
    cardLabel: payment.card_label,
    expiresAt: payment.expires_at,
    instructions: payment.instructions,
    createdAt: new Date().toISOString(),
  };
}

export async function requestManualPayment(): Promise<PaymentRequest> {
  const response = await apiFetch<ManualPaymentResponse>("/api/mini/payments/manual/request", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return mapPaymentResponse(response);
}
