import type {
  ChatAttachmentUpload,
  ChatUser,
  Conversation,
  ConversationResponse,
  ConversationsResponse,
  LinkPreview,
  LinkPreviewResponse,
  MessageResponse,
  MessagesResponse,
  SendMessagePayload,
  UserSearchResponse,
  UnreadCountResponse,
} from "@/types/chat";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface ApiErrorResponse {
  success?: false;
  message?: string;
  errors?: Record<string, string[]>;
}

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
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
    const errorData = data as ApiErrorResponse;

    throw new Error(
      errorData.message ?? "Възникна грешка при комуникацията със сървъра.",
    );
  }

  return data as T;
}

export async function getConversations(
  token: string,
  signal?: AbortSignal,
): Promise<Conversation[]> {
  const response = await request<ConversationsResponse>(
    "/api/mobile/conversations",
    token,
    { signal },
  );

  return response.data;
}

export async function getUnreadMessageCount(token: string): Promise<number> {
  const response = await request<UnreadCountResponse>(
    "/api/mobile/conversations/unread-count",
    token,
  );

  return Math.max(0, Number(response.data.unread_count) || 0);
}

export async function createDirectConversation(
  token: string,
  recipientId: number,
): Promise<Conversation> {
  const response = await request<ConversationResponse>(
    "/api/mobile/conversations/direct",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        recipient_id: recipientId,
      }),
    },
  );

  return response.data;
}

export async function getConversation(
  token: string,
  conversationId: number,
): Promise<Conversation> {
  const response = await request<ConversationResponse>(
    `/api/mobile/conversations/${conversationId}`,
    token,
  );

  return response.data;
}

export async function searchUsers(
  token: string,
  query: string,
  signal?: AbortSignal,
): Promise<ChatUser[]> {
  const params = new URLSearchParams({ search: query });
  const response = await request<UserSearchResponse>(
    `/api/mobile/users?${params.toString()}`,
    token,
    { signal },
  );

  return response.data;
}

export async function getMessages(
  token: string,
  conversationId: number,
  options?: {
    limit?: number;
    beforeId?: number | null;
  },
): Promise<MessagesResponse> {
  const params = new URLSearchParams();

  if (options?.limit) {
    params.set("limit", options.limit.toString());
  }

  if (options?.beforeId) {
    params.set("before_id", options.beforeId.toString());
  }

  const queryString = params.toString();

  return request<MessagesResponse>(
    `/api/mobile/conversations/${conversationId}/messages${
      queryString ? `?${queryString}` : ""
    }`,
    token,
  );
}

export async function sendMessage(
  token: string,
  conversationId: number,
  payload: SendMessagePayload,
): Promise<MessageResponse["data"]> {
  const response = await request<MessageResponse>(
    `/api/mobile/conversations/${conversationId}/messages`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function markConversationAsRead(
  token: string,
  conversationId: number,
  messageId?: number,
): Promise<void> {
  await request<{
    success: true;
    message: string;
    last_read_message_id: number;
  }>(`/api/mobile/conversations/${conversationId}/read`, token, {
    method: "POST",
    body: JSON.stringify(
      messageId
        ? {
            message_id: messageId,
          }
        : {},
    ),
  });
}

export async function sendAttachment(
  token: string,
  conversationId: number,
  attachment: ChatAttachmentUpload,
): Promise<MessageResponse["data"]> {
  const file = new File(attachment.uri);

  const formData = new FormData();

  formData.append("client_message_id", Crypto.randomUUID());

  formData.append(
    "type",
    attachment.mimeType.startsWith("image/")
      ? "image"
      : attachment.mimeType.startsWith("audio/")
        ? "audio"
        : "file",
  );

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/mobile/conversations/${conversationId}/attachments`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  const rawResponse = await response.text();

  let data: MessageResponse | ApiErrorResponse;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Сървърът върна невалиден JSON. Status: ${response.status}. Body: ${rawResponse.slice(0, 2000)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).message ?? "Файлът не можа да бъде изпратен.",
    );
  }

  return (data as MessageResponse).data;
}

export async function getLinkPreview(
  token: string,
  url: string,
  signal?: AbortSignal,
): Promise<LinkPreview | null> {
  const params = new URLSearchParams({ url });
  const response = await request<LinkPreviewResponse>(
    `/api/mobile/link-preview?${params.toString()}`,
    token,
    { signal },
  );

  return response.data;
}
