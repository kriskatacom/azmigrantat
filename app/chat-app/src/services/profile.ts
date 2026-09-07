import { authorizedJson } from "@/services/session-http";
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
  return authorizedJson<T>(`${API_URL}${endpoint}`, token, options);
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

export async function updateCoverImageRequest(
  token: string,
  file: { uri: string; name: string; mimeType: string },
): Promise<AuthUser> {
  const formData = new FormData();
  formData.append("file", new File(file.uri));

  const response = await fetch(`${API_URL}/api/mobile/profile/cover`, {
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
        "Коричната снимка не можа да бъде обновена.",
    );
  }

  return (data as { user: AuthUser }).user;
}

export type PublicUserProfile = {
  id: number;
  is_self: boolean;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username: string | null;
  public_code: string | null;
  profile_image: string | null;
  cover_image?: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  city: string | null;
  country: string | null;
  location: string | null;
  bio: string | null;
  is_active: boolean;
  phone_visible: boolean;
  phone_verified: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_blocked_by_me: boolean;
  is_blocked_me: boolean;
  can_contact: boolean;
};

export async function getPublicProfile(
  token: string,
  userId: number,
): Promise<PublicUserProfile> {
  const response = await request<{ success: true; data: PublicUserProfile }>(
    `/api/mobile/users/${userId}`,
    token,
  );

  return response.data;
}

export async function updateProfilePrivacy(
  token: string,
  phoneVisible: boolean,
): Promise<AuthUser> {
  const response = await request<{ success: true; user: AuthUser }>(
    "/api/mobile/profile/privacy",
    token,
    {
      method: "POST",
      body: JSON.stringify({ phone_visible: phoneVisible }),
    },
  );

  return response.user;
}
