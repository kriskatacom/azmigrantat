import { authorizedJson } from "@/services/session-http";
import type {
  SavedPaymentMethod,
  SavedPaymentMethodsResponse,
  ShortVideoPlan,
  SubscriptionStatus,
} from "@/types/payments";
import { PAYMENTS_ENABLED, STRIPE_SANDBOX_ENABLED } from "@/config/environment";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

function assertPaymentsEnabled(): void {
  if (!PAYMENTS_ENABLED) {
    throw new Error("Плащанията не са достъпни в тази версия на приложението.");
  }
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return authorizedJson<T>(`${API_URL}${endpoint}`, token, options);
}

export async function getPaymentMethods(
  token: string,
): Promise<{ cards: SavedPaymentMethod[]; autoRenewal: boolean }> {
  const response = await request<SavedPaymentMethodsResponse>(
    "/api/mobile/payment-methods",
    token,
  );

  return {
    cards: response.data,
    autoRenewal: response.auto_renewal === true,
  };
}

export async function setAutoRenewal(
  token: string,
  enabled: boolean,
): Promise<boolean> {
  if (!PAYMENTS_ENABLED && !STRIPE_SANDBOX_ENABLED) {
    throw new Error("Управлението на подновяването не е достъпно в тази версия.");
  }
  const response = await request<{ success: true; data: { auto_renewal: boolean } }>(
    "/api/mobile/subscription/renewal",
    token,
    {
      method: "POST",
      body: JSON.stringify({ auto_renewal: enabled }),
    },
  );

  return response.data.auto_renewal;
}

/** Immediately cancels the current paid Sandbox subscription and returns the effective free-plan state. */
export async function deactivatePaidSubscription(token: string): Promise<SubscriptionStatus> {
  if (!PAYMENTS_ENABLED && !STRIPE_SANDBOX_ENABLED) {
    throw new Error("Преминаването към безплатен план не е достъпно в тази версия.");
  }
  const response = await request<{ success: true; data: SubscriptionStatus }>(
    "/api/mobile/subscription/cancel",
    token,
    {
      method: "POST",
      body: JSON.stringify({ confirm_immediate_downgrade: true }),
    },
  );
  return response.data;
}

export async function setDefaultPaymentMethod(
  token: string,
  id: number,
): Promise<SavedPaymentMethod> {
  assertPaymentsEnabled();
  const response = await request<{ success: true; data: SavedPaymentMethod }>(
    `/api/mobile/payment-methods/${id}/default`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function deletePaymentMethod(
  token: string,
  id: number,
): Promise<void> {
  await request(`/api/mobile/payment-methods/${id}/delete`, token, {
    method: "POST",
  });
}

export async function getShortVideoPlans(token: string): Promise<Record<string, ShortVideoPlan>> {
  const response = await request<{ success: true; data: Record<string, ShortVideoPlan> }>(
    "/api/mobile/subscriptions/plans",
    token,
  );
  return response.data;
}

export async function getSubscription(token: string): Promise<SubscriptionStatus | null> {
  const response = await request<{ success: true; data: SubscriptionStatus | null }>(
    "/api/mobile/subscription",
    token,
  );
  return response.data;
}

export async function createSubscriptionCheckout(token: string, plan: string): Promise<string> {
  if (!PAYMENTS_ENABLED && !STRIPE_SANDBOX_ENABLED) {
    throw new Error("Тестовото плащане не е достъпно в тази версия на приложението.");
  }
  const response = await request<{ success: true; url: string }>(
    "/api/mobile/subscription/checkout",
    token,
    { method: "POST", body: JSON.stringify({ plan }) },
  );
  return response.url;
}
