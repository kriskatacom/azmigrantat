import { authorizedJson } from "@/services/session-http";
import type {
  PaymentSettingsResponse,
  SavePaymentMethodPayload,
  SavedPaymentMethod,
  SavedPaymentMethodsResponse,
  ShortVideoPlan,
  SubscriptionStatus,
} from "@/types/payments";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

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
  const response = await request<PaymentSettingsResponse>(
    "/api/mobile/payment-methods/settings",
    token,
    {
      method: "POST",
      body: JSON.stringify({ auto_renewal: enabled }),
    },
  );

  return response.auto_renewal;
}

export async function savePaymentMethod(
  token: string,
  payload: SavePaymentMethodPayload,
): Promise<SavedPaymentMethod> {
  const response = await request<{ success: true; data: SavedPaymentMethod }>(
    "/api/mobile/payment-methods",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function setDefaultPaymentMethod(
  token: string,
  id: number,
): Promise<SavedPaymentMethod> {
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
  const response = await request<{ success: true; url: string }>(
    "/api/mobile/subscription/checkout",
    token,
    { method: "POST", body: JSON.stringify({ plan }) },
  );
  return response.url;
}
