import type { AuthUser } from "@/types/auth";
import type { BlockedUser, BlockedUsersResponse } from "@/types/blocks";
import { File } from "expo-file-system";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

interface ApiErrorResponse {
  success?: false;
  message?: string;
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const rawResponse = await response.text();
  let data: T | ApiErrorResponse;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Сървърът върна невалиден JSON: ${rawResponse.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).message ??
        "Възникна грешка при комуникацията със сървъра.",
    );
  }

  return data as T;
}

export async function getBlockedUsers(
  token: string,
  options?: { limit?: number; beforeId?: number | null },
): Promise<BlockedUsersResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 30));
  if (options?.beforeId) {
    params.set("before_id", String(options.beforeId));
  }

  return request<BlockedUsersResponse>(
    `/api/mobile/blocks?${params.toString()}`,
    token,
  );
}

export async function blockUserByCode(
  token: string,
  code: string,
): Promise<BlockedUser> {
  const response = await request<{ success: true; data: BlockedUser }>(
    "/api/mobile/blocks",
    token,
    {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    },
  );

  return response.data;
}

export async function unblockUser(
  token: string,
  blockId: number,
): Promise<void> {
  await request(`/api/mobile/blocks/${blockId}/unblock`, token, {
    method: "POST",
  });
}

export async function updateProfileImageRequest(
  token: string,
  file: { uri: string; name: string; mimeType: string },
): Promise<AuthUser> {
  const formData = new FormData();
  formData.append("file", new File(file.uri));

  const response = await fetch(`${API_URL}/api/mobile/profile/image`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const rawResponse = await response.text();
  let data: { success: true; user: AuthUser } | ApiErrorResponse;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Сървърът върна невалиден JSON: ${rawResponse.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).message ??
        "Профилната снимка не можа да бъде обновена.",
    );
  }

  return (data as { user: AuthUser }).user;
}
