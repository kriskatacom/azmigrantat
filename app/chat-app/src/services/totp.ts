import { authorizedJson } from "@/services/session-http";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export type TotpStatus = {
  enabled: boolean;
  pending: boolean;
};

export type TotpSetup = {
  secret: string;
  otpauth_url: string;
  account: string;
  issuer: string;
};

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return authorizedJson<T>(`${API_URL}${endpoint}`, token, options);
}

export async function getTotpStatus(token: string): Promise<TotpStatus> {
  const response = await request<{ success: true } & TotpStatus>(
    "/api/mobile/totp",
    token,
  );

  return {
    enabled: response.enabled === true,
    pending: response.pending === true,
  };
}

export async function startTotpSetup(token: string): Promise<TotpSetup> {
  const response = await request<{ success: true } & TotpSetup>(
    "/api/mobile/totp/start",
    token,
    { method: "POST" },
  );

  return {
    secret: response.secret,
    otpauth_url: response.otpauth_url,
    account: response.account,
    issuer: response.issuer,
  };
}

export async function confirmTotpSetup(
  token: string,
  code: string,
): Promise<void> {
  await request("/api/mobile/totp/confirm", token, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(token: string, code: string): Promise<void> {
  await request("/api/mobile/totp/disable", token, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
