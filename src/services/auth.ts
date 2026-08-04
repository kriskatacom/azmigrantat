import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
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
  token_type: "Bearer";
  expires_in: number;
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
  await request<LogoutResponse>("/api/mobile/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
