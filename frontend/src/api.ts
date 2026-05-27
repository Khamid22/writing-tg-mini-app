import type { LearnerState, PaymentRequest } from "./types";

const TOKEN_KEY = "uzbek-words-api-token";

type ApiUser = {
  display_name: string;
  username: string | null;
  tier: LearnerState["tier"];
  premium_until: string | null;
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
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
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

export async function requestManualPayment(token: string): Promise<PaymentRequest> {
  const response = await apiFetch<ManualPaymentResponse>("/api/mini/payments/manual/request", {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return mapPaymentResponse(response);
}
