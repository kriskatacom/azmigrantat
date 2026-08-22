import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  DeleteChatMessagesPayload,
  DeleteAccountPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
} from "@/types/auth";
import { getDeviceIdentity } from "@/services/device-identity";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID!;

interface ApiErrorResponse {
  success?: false;
  message?: string;
  errors?: Record<string, string[]>;
  retry_after?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter: number | null;

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface MobileAuthResponse {
  success: true;
  access_token: string;
  refresh_token?: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_expires_in?: number;
  user: AuthUser;
  message?: string;
  device_secret?: string;
  device_trusted?: boolean;
  has_pin?: boolean;
}

interface TotpPendingResponse {
  success: true;
  requires_totp: true;
  pending_token: string;
  expires_in: number;
}

interface DevicePendingResponse {
  success: true;
  requires_device_verification: true;
  pending_token: string;
  expires_in: number;
  methods?: string[];
  device_name?: string | null;
}

export class TotpRequiredError extends Error {
  readonly pendingToken: string;
  readonly expiresIn: number;

  constructor(pendingToken: string, expiresIn: number) {
    super("Въведете кода от Google Authenticator.");
    this.name = "TotpRequiredError";
    this.pendingToken = pendingToken;
    this.expiresIn = expiresIn;
  }
}

export class DeviceVerificationRequiredError extends Error {
  readonly pendingToken: string;
  readonly expiresIn: number;
  readonly methods: string[];
  readonly deviceName: string | null;

  constructor(
    pendingToken: string,
    expiresIn: number,
    methods: string[] = ["previous_device", "email"],
    deviceName: string | null = null,
  ) {
    super("Потвърдете входа от предишното устройство или с код по имейл.");
    this.name = "DeviceVerificationRequiredError";
    this.pendingToken = pendingToken;
    this.expiresIn = expiresIn;
    this.methods = methods;
    this.deviceName = deviceName;
  }
}

function isTotpPending(
  data: MobileAuthResponse | TotpPendingResponse | DevicePendingResponse,
): data is TotpPendingResponse {
  return "requires_totp" in data && data.requires_totp === true;
}

function isDevicePending(
  data: MobileAuthResponse | TotpPendingResponse | DevicePendingResponse,
): data is DevicePendingResponse {
  return (
    "requires_device_verification" in data &&
    data.requires_device_verification === true
  );
}

function toAuthResponse(response: MobileAuthResponse): AuthResponse {
  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresIn: response.expires_in,
    user: response.user,
    deviceSecret: response.device_secret ?? null,
    hasPin: response.has_pin ?? response.user.has_pin,
  };
}

async function withDevice<T extends Record<string, unknown>>(
  payload: T,
): Promise<T & Awaited<ReturnType<typeof getDeviceIdentity>>> {
  const device = await getDeviceIdentity();
  return { ...payload, ...device };
}

async function finishMobileAuth(
  response: MobileAuthResponse | TotpPendingResponse | DevicePendingResponse,
): Promise<AuthResponse> {
  if (isDevicePending(response)) {
    throw new DeviceVerificationRequiredError(
      response.pending_token,
      response.expires_in,
      response.methods ?? ["previous_device", "email"],
      response.device_name ?? null,
    );
  }

  if (isTotpPending(response)) {
    throw new TotpRequiredError(response.pending_token, response.expires_in);
  }

  return toAuthResponse(response);
}

export async function completeTotpLoginRequest(
  pendingToken: string,
  code: string,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/login/totp", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        pending_token: pendingToken,
        code: code.replace(/\D/g, ""),
      }),
    ),
  });

  return toAuthResponse(response);
}

interface MeResponse {
  success: true;
  user: AuthUser;
}

interface LogoutResponse {
  success: true;
  message: string;
}

interface ProfileResponse {
  success: true;
  user: AuthUser;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const rawResponse = await response.text();

  console.log("API status:", response.status);
  console.log("API response:", rawResponse);

  let data: T | ApiErrorResponse;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Сървърът върна невалиден JSON: ${rawResponse.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    const errorData = data as ApiErrorResponse;
    const retryAfter =
      typeof errorData.retry_after === "number" ? errorData.retry_after : null;

    throw new ApiError(
      errorData.message ?? "Възникна грешка при комуникацията със сървъра.",
      response.status,
      retryAfter,
    );
  }

  return data as T;
}

export async function loginRequest(
  payload: LoginPayload,
): Promise<AuthResponse> {
  const response = await request<
    MobileAuthResponse | TotpPendingResponse | DevicePendingResponse
  >("/api/mobile/login", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        client_id: CLIENT_ID,
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        remember_me: Boolean(payload.rememberMe),
      }),
    ),
  });

  return finishMobileAuth(response);
}

export async function pinLoginRequest(
  email: string,
  pin: string,
  rememberMe = false,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/login/pin", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        client_id: CLIENT_ID,
        email: email.trim().toLowerCase(),
        pin: pin.replace(/\D/g, ""),
        remember_me: Boolean(rememberMe),
      }),
    ),
  });

  return toAuthResponse(response);
}

export async function deviceSecretLoginRequest(
  email: string,
  deviceSecret: string,
  rememberMe = false,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/login/device", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        client_id: CLIENT_ID,
        email: email.trim().toLowerCase(),
        device_secret: deviceSecret,
        remember_me: Boolean(rememberMe),
      }),
    ),
  });

  return toAuthResponse(response);
}

export async function loginOptionsRequest(
  email: string,
): Promise<{ trusted: boolean; hasPin: boolean }> {
  const response = await request<{
    success: true;
    trusted: boolean;
    has_pin: boolean;
  }>("/api/mobile/login/options", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        client_id: CLIENT_ID,
        email: email.trim().toLowerCase(),
      }),
    ),
  });

  return { trusted: response.trusted, hasPin: response.has_pin };
}

export async function devicePendingStatusRequest(
  pendingToken: string,
): Promise<{ approved: boolean; expiresIn: number }> {
  const response = await request<{
    success: true;
    approved: boolean;
    expires_in: number;
  }>("/api/mobile/device/pending/status", {
    method: "POST",
    body: JSON.stringify({ pending_token: pendingToken }),
  });

  return { approved: response.approved, expiresIn: response.expires_in };
}

export async function completeDevicePendingRequest(
  pendingToken: string,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>(
    "/api/mobile/device/pending/complete",
    {
      method: "POST",
      body: JSON.stringify({ pending_token: pendingToken }),
    },
  );

  return toAuthResponse(response);
}

export async function sendDeviceEmailCodeRequest(
  pendingToken: string,
): Promise<{ message: string }> {
  const response = await request<{ success: true; message: string }>(
    "/api/mobile/device/pending/email",
    {
      method: "POST",
      body: JSON.stringify({ pending_token: pendingToken }),
    },
  );

  return { message: response.message };
}

export async function verifyDeviceEmailCodeRequest(
  pendingToken: string,
  code: string,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>(
    "/api/mobile/device/pending/email/verify",
    {
      method: "POST",
      body: JSON.stringify({
        pending_token: pendingToken,
        code: code.replace(/\D/g, ""),
      }),
    },
  );

  return toAuthResponse(response);
}

export async function listDevicePendingRequest(
  token: string,
): Promise<
  Array<{
    id: number;
    device_name: string | null;
    platform: string | null;
    created_at: string | null;
    expires_at: string | null;
  }>
> {
  const response = await request<{
    success: true;
    pending: Array<{
      id: number;
      device_name: string | null;
      platform: string | null;
      created_at: string | null;
      expires_at: string | null;
    }>;
  }>("/api/mobile/device/pending", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.pending;
}

export async function approveDevicePendingRequest(
  token: string,
  pendingId: number,
): Promise<void> {
  await request<{ success: true; message: string }>(
    "/api/mobile/device/pending/approve",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(
        await withDevice({
          pending_id: pendingId,
        }),
      ),
    },
  );
}

export async function setLoginPinRequest(
  token: string,
  pin: string,
): Promise<void> {
  await request<{ success: true; has_pin: boolean }>(
    "/api/mobile/device/pin",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin: pin.replace(/\D/g, "") }),
    },
  );
}

export async function clearLoginPinRequest(token: string): Promise<void> {
  await request<{ success: true; has_pin: boolean }>(
    "/api/mobile/device/pin/clear",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/register", {
    method: "POST",
    body: JSON.stringify(
      await withDevice({
        client_id: CLIENT_ID,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        passwordConfirmation: payload.passwordConfirmation,
      }),
    ),
  });

  return toAuthResponse(response);
}

export async function forgotPasswordRequest(
  email: string,
): Promise<{ message: string }> {
  const response = await request<{ success: true; message: string }>(
    "/api/mobile/password/forgot",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: CLIENT_ID,
        email: email.trim().toLowerCase(),
      }),
    },
  );

  return { message: response.message };
}

export async function resetPasswordRequest(
  payload: ResetPasswordPayload,
): Promise<{ message: string }> {
  const response = await request<{ success: true; message: string }>(
    "/api/mobile/password/reset",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: CLIENT_ID,
        email: payload.email.trim().toLowerCase(),
        code: payload.code.replace(/\D/g, ""),
        password: payload.password,
        passwordConfirmation: payload.passwordConfirmation,
      }),
    },
  );

  return { message: response.message };
}

export async function googleLoginRequest(
  idToken: string,
  rememberMe = false,
): Promise<AuthResponse> {
  const response = await request<
    MobileAuthResponse | TotpPendingResponse | DevicePendingResponse
  >(
    "/api/mobile/auth/google",
    {
      method: "POST",
      body: JSON.stringify(
        await withDevice({
          client_id: CLIENT_ID,
          id_token: idToken,
          remember_me: Boolean(rememberMe),
        }),
      ),
    },
  );

  return finishMobileAuth(response);
}

export async function refreshRequest(refreshToken: string): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/refresh", {
    method: "POST",
    body: JSON.stringify({
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresIn: response.expires_in,
    user: response.user,
  };
}

export async function getCurrentUserRequest(token: string): Promise<AuthUser> {
  const response = await request<MeResponse>("/api/mobile/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.user;
}

export async function logoutRequest(token: string): Promise<void> {
  try {
    await request<LogoutResponse>("/api/mobile/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Необходима е автентикация.") {
      return;
    }

    throw error;
  }
}

export async function updateProfileRequest(
  token: string,
  payload: UpdateProfilePayload,
): Promise<AuthUser> {
  const response = await request<ProfileResponse>("/api/mobile/profile", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  return response.user;
}

export async function changePasswordRequest(
  token: string,
  payload: ChangePasswordPayload,
): Promise<void> {
  await request<{ success: true; message?: string }>(
    "/api/mobile/profile/password",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteChatMessagesRequest(
  token: string,
  payload: DeleteChatMessagesPayload,
): Promise<number | undefined> {
  const response = await request<{
    success: true;
    message?: string;
    deleted_messages_count?: number;
  }>("/api/mobile/profile/chat-messages", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  return response.deleted_messages_count;
}

export async function deleteAccountRequest(
  token: string,
  payload: DeleteAccountPayload,
): Promise<void> {
  await request<{ success: true; message?: string }>(
    "/api/mobile/profile/delete",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
  );
}

export async function sendPhoneVerificationRequest(
  token: string,
  phone: string,
  channel: "whatsapp" | "sms",
): Promise<{ message: string; channel: string | null }> {
  const response = await request<{
    success: true;
    message: string;
    channel: string | null;
  }>("/api/mobile/phone/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone, channel }),
  });

  return { message: response.message, channel: response.channel };
}

export async function verifyPhoneRequest(
  token: string,
  phone: string,
  code: string,
): Promise<AuthUser> {
  const response = await request<{
    success: true;
    message: string;
    user: AuthUser;
  }>("/api/mobile/phone/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone, code }),
  });

  return response.user;
}
