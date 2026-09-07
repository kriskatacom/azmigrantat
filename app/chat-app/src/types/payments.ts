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

export type SavePaymentMethodPayload = {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
  holder_name?: string;
};
