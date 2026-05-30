export type AdminWord = {
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
  audio_status: string;
  quality_status: "draft" | "review" | "published" | "archived";
  is_active: boolean;
  created_at: string | null;
};

export type AdminWordInput = {
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
  audio_status: string;
  quality_status: "draft" | "review" | "published" | "archived";
  is_active: boolean;
};

export type AdminSummary = {
  stats: {
    total_words: number;
    published_words: number;
    draft_words: number;
    total_users: number;
    premium_users: number;
    pending_payments: number;
    active_today: number;
    new_users_today: number;
    words_learned_today: number;
    tests_completed_today: number;
    limit_hits_today: number;
    review_users_today: number;
    quiz_accuracy: number;
    missing_audio: number;
    missing_writing_prompt: number;
    open_reports: number;
    review_words: number;
  };
  topic_coverage: Array<{ topic: string; count: number }>;
  weak_words: Array<{ word: string; level: string; answered: number; accuracy: number }>;
  recent_words: AdminWord[];
};

export type AdminLoginResponse = {
  token: string;
};

export type AdminUser = {
  id: number;
  display_name: string;
  username: string | null;
  tier: "free" | "paid";
  premium_until: string | null;
  streak_days: number;
  last_seen_at: string | null;
  created_at: string | null;
  learned_count: number;
  total_points: number;
};

export type AdminUserDetail = AdminUser & {
  mastered_count: number;
  quiz_attempted: number;
  quiz_accuracy: number;
};

export type AdminUsersResponse = {
  total: number;
  items: AdminUser[];
};

export type AdminPayment = {
  id: number;
  code: string;
  user_id: number;
  user_display_name: string;
  user_username: string | null;
  plan: string;
  plan_days: number;
  amount_uzs: number;
  status: "pending" | "submitted" | "approved" | "cancelled" | "expired";
  admin_note: string | null;
  created_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
};

export type AdminPaymentsResponse = {
  total: number;
  counts: { pending: number; submitted: number; approved: number; cancelled: number };
  items: AdminPayment[];
};

export type AnalyticsPoint = { date: string; count: number };

export type AdminAnalytics = {
  signups: AnalyticsPoint[];
  dau: AnalyticsPoint[];
};

export type AdminSettings = {
  free_daily_word_limit: number;
  manual_payment_amount_uzs: number;
  manual_payment_plan_days: number;
  manual_payment_card_label: string;
};

export type AdminSettingsPatch = Partial<AdminSettings>;

export type AdminImportResponse = {
  imported: number;
  skipped: string[];
  skipped_count: number;
};

export type AdminPronunciationResponse = {
  checked: number;
  updated: number;
  not_found: string[];
  not_found_count: number;
};

export type AdminWordReport = {
  id: number;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string | null;
  resolved_at: string | null;
  word: AdminWord | null;
  user: { id: number; display_name: string; username: string | null } | null;
};

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }
  return "";
}

async function adminFetch<T>(path: string, adminToken: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${adminToken}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Admin API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loginAdmin(password: string): Promise<AdminLoginResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    throw new Error(`Admin login ${response.status}`);
  }
  return response.json() as Promise<AdminLoginResponse>;
}

export async function fetchAdminSummary(adminToken: string): Promise<AdminSummary> {
  return adminFetch<AdminSummary>("/api/admin/summary", adminToken);
}

export async function fetchAdminWords(
  adminToken: string,
  filters: { search?: string; status?: string; level?: string; wordType?: string } = {},
): Promise<{ items: AdminWord[] }> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.level) params.set("level", filters.level);
  if (filters.wordType) params.set("word_type", filters.wordType);
  const query = params.toString();
  return adminFetch<{ items: AdminWord[] }>(`/api/admin/words${query ? `?${query}` : ""}`, adminToken);
}

export async function fetchAdminWordReports(
  adminToken: string,
  status: "open" | "resolved" | "dismissed" | "all" = "open",
): Promise<{ items: AdminWordReport[] }> {
  return adminFetch<{ items: AdminWordReport[] }>(`/api/admin/word-reports?status=${status}`, adminToken);
}

export async function updateAdminWordReport(
  adminToken: string,
  reportId: number,
  status: "open" | "resolved" | "dismissed",
): Promise<AdminWordReport> {
  return adminFetch<AdminWordReport>(`/api/admin/word-reports/${reportId}`, adminToken, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createAdminWord(adminToken: string, payload: AdminWordInput): Promise<AdminWord> {
  return adminFetch<AdminWord>("/api/admin/words", adminToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminWord(
  adminToken: string,
  wordId: number,
  payload: Partial<AdminWordInput>,
): Promise<AdminWord> {
  return adminFetch<AdminWord>(`/api/admin/words/${wordId}`, adminToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function disableAdminWord(adminToken: string, wordId: number): Promise<AdminWord> {
  return adminFetch<AdminWord>(`/api/admin/words/${wordId}`, adminToken, {
    method: "DELETE",
  });
}

export async function enrichAdminWordPronunciation(adminToken: string, wordId: number): Promise<{ word: AdminWord; updated: boolean; source: string | null }> {
  return adminFetch<{ word: AdminWord; updated: boolean; source: string | null }>(
    `/api/admin/words/${wordId}/enrich-pronunciation`,
    adminToken,
    { method: "POST" },
  );
}

export async function enrichAdminPronunciations(adminToken: string, limit = 50): Promise<AdminPronunciationResponse> {
  return adminFetch<AdminPronunciationResponse>(
    `/api/admin/words/enrich-pronunciation?limit=${limit}`,
    adminToken,
    { method: "POST" },
  );
}

export async function importAdminWordsFile(
  adminToken: string,
  file: File,
  defaultActive: boolean,
): Promise<AdminImportResponse> {
  const formData = new FormData();
  formData.append("upload", file);
  formData.append("default_active", String(defaultActive));
  return adminFetch<AdminImportResponse>("/api/admin/words/import-file", adminToken, {
    method: "POST",
    body: formData,
  });
}

export async function importAdminWordsUrl(
  adminToken: string,
  url: string,
  defaultActive: boolean,
): Promise<AdminImportResponse> {
  return adminFetch<AdminImportResponse>("/api/admin/words/import-url", adminToken, {
    method: "POST",
    body: JSON.stringify({ url, default_active: defaultActive }),
  });
}

// ── Users ──

export async function fetchAdminUsers(
  adminToken: string,
  filters: { search?: string; tier?: string; limit?: number; offset?: number } = {},
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  const q = params.toString();
  return adminFetch<AdminUsersResponse>(`/api/admin/users${q ? `?${q}` : ""}`, adminToken);
}

export async function fetchAdminUserDetail(adminToken: string, userId: number): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`/api/admin/users/${userId}`, adminToken);
}

export async function updateAdminUser(
  adminToken: string,
  userId: number,
  payload: { tier?: "free" | "paid"; premium_until?: string },
): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/api/admin/users/${userId}`, adminToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── Payments ──

export async function fetchAdminPayments(
  adminToken: string,
  filters: { status?: string; limit?: number; offset?: number } = {},
): Promise<AdminPaymentsResponse> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  const q = params.toString();
  return adminFetch<AdminPaymentsResponse>(`/api/admin/payments${q ? `?${q}` : ""}`, adminToken);
}

export async function approveAdminPayment(adminToken: string, code: string): Promise<AdminPayment> {
  return adminFetch<AdminPayment>(`/api/admin/payments/${code}/approve`, adminToken, { method: "POST" });
}

export async function cancelAdminPayment(adminToken: string, code: string): Promise<AdminPayment> {
  return adminFetch<AdminPayment>(`/api/admin/payments/${code}/cancel`, adminToken, { method: "POST" });
}

// ── Analytics ──

export async function fetchAdminAnalytics(adminToken: string, days = 30): Promise<AdminAnalytics> {
  return adminFetch<AdminAnalytics>(`/api/admin/analytics?days=${days}`, adminToken);
}

// ── Settings ──

export async function fetchAdminSettings(adminToken: string): Promise<AdminSettings> {
  return adminFetch<AdminSettings>("/api/admin/settings", adminToken);
}

export async function patchAdminSettings(adminToken: string, payload: AdminSettingsPatch): Promise<AdminSettings> {
  return adminFetch<AdminSettings>("/api/admin/settings", adminToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
