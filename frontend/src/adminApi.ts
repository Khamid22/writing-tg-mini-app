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
  audio_url: string | null;
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
  audio_url: string | null;
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
  };
  recent_words: AdminWord[];
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
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Admin API ${response.status}`);
  }
  return response.json() as Promise<T>;
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
