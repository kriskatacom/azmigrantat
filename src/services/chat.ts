import type {
    Conversation,
    ConversationResponse,
    ConversationsResponse,
    MessageResponse,
    MessagesResponse,
    SendMessagePayload,
    ChatUser,
    UserSearchResponse,
    LinkPreview,
    LinkPreviewResponse,
} from "@/types/chat";

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

export async function getConversations(token: string): Promise<Conversation[]> {
  const response = await request<ConversationsResponse>(
    "/api/mobile/conversations",
    token,
  );

  return response.data;
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
