export type SavedPaymentMethod = {
  id: number;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder_name: string | null;
  is_default: boolean;
  created_at: string | null;
};

export type SavedPaymentMethodsResponse = {
  success: true;
  data: SavedPaymentMethod[];
  auto_renewal?: boolean;
};

export type PaymentSettingsResponse = {
  success: true;
  message: string;
  auto_renewal: boolean;
};

export type ShortVideoPlan = {
  name: string;
  price_cents: number | null;
  currency: string;
  interval?: string | null;
  interval_count?: number | null;
  active?: boolean;
  configured?: boolean;
  description?: string;
  features?: string[];
};

export type SubscriptionStatus = {
  plan: string;
  status: string;
  entitled: boolean;
  auto_renewal: boolean;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};
