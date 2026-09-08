export interface NotificationActor {
  id: number;
  name: string;
  username: string | null;
  profile_image: string | null;
  is_active: boolean;
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string | null;
  message: string | null;
  count: number;
  is_read: boolean;
  actor_id: number | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  actor: NotificationActor | null;
}

export interface NotificationsResponse {
  success: true;
  data: AppNotification[];
  meta: {
    has_more: boolean;
    next_before_id: number | null;
    unread_count: number;
  };
}

export interface NotificationResponse {
  success: true;
  data: AppNotification;
  meta?: {
    unread_count: number;
  };
}

export interface UnreadNotificationsResponse {
  success: true;
  data: {
    unread_count: number;
  };
}

export type NotificationSocketEvent =
  | "new"
  | "updated"
  | "read-all"
  | "cleared"
  | "deleted";

export const MISSED_CALL_CATEGORY = "missed_call";
export const MISSED_CALL_CALLBACK_ACTION = "missed_call_callback";
export const MISSED_CALL_OPEN_CHAT_ACTION = "missed_call_open_chat";

export function isNotificationUnread(notification: {
  is_read?: boolean | number | string | null;
}): boolean {
  return notification.is_read !== true && notification.is_read !== 1 && notification.is_read !== "1";
}

export function getMissedCallActorId(notification: AppNotification): number | null {
  if (notification.type !== "missed_video_call") {
    return null;
  }

  if (notification.actor_id && Number.isInteger(notification.actor_id)) {
    return notification.actor_id;
  }

  const callerId = Number(notification.data?.caller_id);
  return Number.isInteger(callerId) && callerId > 0 ? callerId : null;
}
