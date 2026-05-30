import type { LearnerState, PaymentRequest } from "./types";

const TOKEN_KEY = "uzbek-words-api-token";

export type ApiUser = {
  id: number;
  display_name: string;
  username: string | null;
  tier: LearnerState["tier"];
  premium_until: string | null;
  selected_level: string;
  preferred_topic: string | null;
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
  is_review: boolean;
  limit: ApiLimit;
};

export type WordEvent =
  | "seen"
  | "listened"
  | "flipped"
  | "learned"
  | "practice_later"
  | "remembered"
  | "forgot"
  | "undo_learned"
  | "bookmark"
  | "unbookmark";
export type WordReportReason = "too_difficult" | "wrong_meaning" | "audio_broken" | "bad_example" | "already_know";

export type WordEventResponse = {
  ok: boolean;
  progress: { status: string; mastery_score: number; is_bookmarked: boolean };
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
  selected_level?: string;
};

export type ApiLevelProgress = {
  level: string;
  total: number;
  learned: number;
  unlock_at: number;
  is_unlocked: boolean;
};

export type DashboardResponse = {
  stats: ApiDashboardStats;
  level_progress?: ApiLevelProgress[];
  recent_words: ApiWord[];
};

export type LeaderboardItem = {
  rank: number;
  user_id: number;
  display_name: string;
  points: number;
  learned_total: number;
};

export type LeaderboardResponse = {
  period: string;
  items: LeaderboardItem[];
};

export type PublicProfileResponse = {
  user: { id: number; display_name: string };
  stats: { learned_total: number; mastered_total: number; streak_days: number; total_points: number };
  recent_words: ApiWord[];
};

export type ApiProgressRow = {
  word_id: number;
  status: string;
  mastery_score: number;
  is_bookmarked: boolean;
};

export type ProgressResponse = {
  items: ApiProgressRow[];
  levels?: ApiLevelProgress[];
};

export type TopicsResponse = {
  items: Array<{ topic: string; count: number }>;
};

export type FavoritesResponse = {
  items: ApiWord[];
};

export type ApiCollection = {
  name: string;
  total_words: number;
  learned_count: number;
  level_range: string;
  is_locked: boolean;
  is_above_level: boolean;
};

export type CollectionsResponse = {
  items: ApiCollection[];
  free_collection_name: string;
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
    selectedLevel: user.selected_level || state.selectedLevel,
    preferredTopic: user.preferred_topic ?? state.preferredTopic ?? null,
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

export async function fetchTodayWord(collection?: string | null, topic?: string | null): Promise<TodayWordResponse> {
  const params = new URLSearchParams();
  if (collection) params.set("collection", collection);
  if (topic) params.set("topic", topic);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<TodayWordResponse>(`/api/mini/words/today${query}`);
}

export async function fetchTopics(): Promise<TopicsResponse> {
  return apiFetch<TopicsResponse>("/api/mini/words/topics");
}

export async function fetchFavorites(): Promise<FavoritesResponse> {
  return apiFetch<FavoritesResponse>("/api/mini/words/favorites");
}

export async function fetchWordAudio(wordId: number): Promise<{ word: string; audio_url: string | null }> {
  return apiFetch<{ word: string; audio_url: string | null }>(`/api/mini/words/${wordId}/audio`);
}

export async function fetchCollections(): Promise<CollectionsResponse> {
  return apiFetch<CollectionsResponse>("/api/mini/collections");
}

export async function sendWordEvent(wordId: number, event: WordEvent): Promise<WordEventResponse> {
  return apiFetch<WordEventResponse>(`/api/mini/words/${wordId}/events`, {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}

export async function reportWord(wordId: number, reason: WordReportReason, details = ""): Promise<{ ok: boolean; report_id: number }> {
  return apiFetch<{ ok: boolean; report_id: number }>(`/api/mini/words/${wordId}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason, details }),
  });
}

export async function startTest(
  questionCount: number = 5,
  mode: string = "learned_words",
  collection?: string | null,
): Promise<StartTestResponse> {
  return apiFetch<StartTestResponse>("/api/mini/tests/start", {
    method: "POST",
    body: JSON.stringify({ question_count: questionCount, mode, collection: collection ?? null }),
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

export async function fetchProgress(): Promise<ProgressResponse> {
  return apiFetch<ProgressResponse>("/api/mini/progress");
}

export async function updatePreferences(payload: {
  display_name?: string;
  selected_level?: string;
  preferred_topic?: string | null;
}): Promise<{ user: ApiUser; limit: ApiLimit }> {
  return apiFetch<{ user: ApiUser; limit: ApiLimit }>("/api/mini/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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
