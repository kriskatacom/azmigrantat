import { authorizedJson } from "@/services/session-http";
import type {
  AppNotification,
  NotificationResponse,
  NotificationsResponse,
  UnreadNotificationsResponse,
} from "@/types/notifications";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return authorizedJson<T>(`${API_URL}${endpoint}`, token, options);
}

export async function getNotifications(
  token: string,
  options: { limit?: number; beforeId?: number } = {},
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.beforeId) params.set("before_id", String(options.beforeId));
  const query = params.toString();

  return request<NotificationsResponse>(
    `/api/mobile/notifications${query ? `?${query}` : ""}`,
    token,
  );
}

export async function getNotification(
  token: string,
  notificationId: number,
): Promise<AppNotification> {
  const response = await request<NotificationResponse>(
    `/api/mobile/notifications/${notificationId}`,
    token,
  );

  return response.data;
}

export async function getUnreadNotificationCount(token: string): Promise<number> {
  const response = await request<UnreadNotificationsResponse>(
    "/api/mobile/notifications/unread-count",
    token,
  );

  return Math.max(0, Number(response.data.unread_count) || 0);
}

export async function markNotificationAsRead(
  token: string,
  notificationId: number,
): Promise<AppNotification> {
  const response = await request<NotificationResponse>(
    `/api/mobile/notifications/${notificationId}/read`,
    token,
    { method: "POST" },
  );

  return response.data;
}

export async function markAllNotificationsAsRead(token: string): Promise<void> {
  await request<UnreadNotificationsResponse>(
    "/api/mobile/notifications/read-all",
    token,
    { method: "POST" },
  );
}

export async function deleteAllNotifications(token: string): Promise<void> {
  await request<UnreadNotificationsResponse>(
    "/api/mobile/notifications/delete-all",
    token,
    { method: "POST" },
  );
}

export async function deleteNotification(
  token: string,
  notificationId: number,
): Promise<void> {
  await request<UnreadNotificationsResponse>(
    `/api/mobile/notifications/${notificationId}/delete`,
    token,
    { method: "POST" },
  );
}
