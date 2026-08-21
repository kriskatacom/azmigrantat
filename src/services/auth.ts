import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  DeleteChatMessagesPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from "@/types/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID!;

interface ApiErrorResponse {
  success?: false;
  message?: string;
  errors?: Record<string, string[]>;
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

    throw new Error(
      errorData.message ?? "Възникна грешка при комуникацията със сървъра.",
    );
  }

  return data as T;
}

export async function loginRequest(
  payload: LoginPayload,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/login", {
    method: "POST",
    body: JSON.stringify({
      client_id: CLIENT_ID,
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    }),
  });

  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresIn: response.expires_in,
    user: response.user,
  };
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>("/api/mobile/register", {
    method: "POST",
    body: JSON.stringify({
      client_id: CLIENT_ID,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      passwordConfirmation: payload.passwordConfirmation,
    }),
  });

  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresIn: response.expires_in,
    user: response.user,
  };
}

export async function googleLoginRequest(
  idToken: string,
): Promise<AuthResponse> {
  const response = await request<MobileAuthResponse>(
    "/api/mobile/auth/google",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: CLIENT_ID,
        id_token: idToken,
      }),
    },
  );

  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresIn: response.expires_in,
    user: response.user,
  };
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
