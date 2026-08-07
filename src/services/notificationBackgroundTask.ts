import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";

const TASK_NAME = "notification-action-task";

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      return;
    }

    if (!("actionIdentifier" in data)) {
      return;
    }

    const response = data;

    if (response.actionIdentifier !== "mark_read") {
      return;
    }

    const notification = response.notification;
    const payload = notification.request.content.data;

    const conversationId = Number(payload?.conversation_id);
    const messageId =
      payload?.message_id !== undefined
        ? Number(payload.message_id)
        : undefined;

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return;
    }

    const token = await SecureStore.getItemAsync("auth_token");

    if (!token) {
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/mobile/conversations/${conversationId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(
            messageId
              ? {
                  message_id: messageId,
                }
              : {},
          ),
        },
      );

      if (!response.ok) {
        return;
      }

      await Notifications.dismissNotificationAsync(
        notification.request.identifier,
      );
    } catch {
      // Background task-а не трябва да crash-ва приложението.
    }
  },
);

void Notifications.registerTaskAsync(TASK_NAME);
