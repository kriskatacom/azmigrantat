export interface ChatUser {
  id: number;
  name: string;
  username: string | null;
  profile_image: string | null;
  is_active: boolean;
}

export interface UserSearchResponse {
  success: true;
  data: ChatUser[];
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  client_message_id: string | null;
  type: "text" | "image" | "video" | "audio" | "file" | "system";
  content: string | null;
  metadata: Record<string, unknown> | null;
  status: "sent" | "delivered" | "read";
  is_read?: boolean;
  delivered_at: string | null;
  read_at: string | null;
  edited_at: string | null;
  created_at: string | null;
  sender: ChatUser | null;
}

export interface Conversation {
  id: number;
  type: string;
  title: string | null;
  image: string | null;

  other_user: ChatUser | null;

  last_message: ChatMessage | null;
  last_read_message_id: number | null;

  unread_count: number;

  is_muted: boolean;
  is_archived: boolean;
  updated_at: string | null;
}

export interface ConversationsResponse {
  success: true;
  data: Conversation[];
}

export interface MessagesResponse {
  success: true;
  data: ChatMessage[];
  meta: {
    has_more: boolean;
    next_before_id: number | null;
  };
}

export interface ConversationResponse {
  success: true;
  data: Conversation;
}

export interface MessageResponse {
  success: true;
  data: ChatMessage;
}

export interface SendMessagePayload {
  client_message_id: string;
  content: string;
}

export interface ChatAttachmentUpload {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
}

export interface LinkPreviewResponse {
  success: true;
  data: LinkPreview | null;
}
