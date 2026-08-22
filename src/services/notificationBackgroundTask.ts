import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";

import {
  INCOMING_CALL_DECLINE_ACTION,
  dismissIncomingCallAlert,
  parseIncomingCallData,
  presentIncomingCallAlert,
} from "@/services/incoming-call";
import { declineCallViaHttp } from "@/services/realtime-http";

const TASK_NAME = "notification-action-task";
const TOKEN_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      return;
    }

    const isNotificationResponse = "actionIdentifier" in data;

    if (!isNotificationResponse) {
      const notification = data as unknown as Notifications.Notification;
      const payload = parseIncomingCallData(
        notification.request?.content?.data as Record<string, unknown> | undefined,
      );

      if (!payload) {
        const rawData = (data as { data?: Record<string, unknown> }).data;
        const nestedPayload = parseIncomingCallData(rawData);

        if (!nestedPayload) {
          return;
        }

        if (nestedPayload.type === "incoming_call_ended") {
          await dismissIncomingCallAlert(nestedPayload.call_id);
          return;
        }

        await presentIncomingCallAlert({
          callId: nestedPayload.call_id,
          callerId: nestedPayload.caller_id,
          callerName: nestedPayload.caller_name,
          callerAvatar: nestedPayload.caller_avatar,
          callType: nestedPayload.call_type,
        });
        return;
      }

      if (payload.type === "incoming_call_ended") {
        await dismissIncomingCallAlert(payload.call_id);
        return;
      }

      await presentIncomingCallAlert({
        callId: payload.call_id,
        callerId: payload.caller_id,
        callerName: payload.caller_name,
        callerAvatar: payload.caller_avatar,
        callType: payload.call_type,
      });
      return;
    }

    const response = data;
    const notification = response.notification;
    const payloadData = notification.request.content.data as Record<
      string,
      unknown
    >;
    const incomingCall = parseIncomingCallData(payloadData);

    if (
      incomingCall &&
      (response.actionIdentifier === INCOMING_CALL_DECLINE_ACTION ||
        response.actionIdentifier === "incoming_call_decline")
    ) {
      const token = await SecureStore.getItemAsync(
        "auth_token",
        TOKEN_STORE_OPTIONS,
      );

      try {
        if (token) {
          await declineCallViaHttp(token, incomingCall.call_id);
        }
      } catch {
        // Background decline should not crash the headless task.
      }

      await dismissIncomingCallAlert(incomingCall.call_id);
      return;
    }

    if (incomingCall?.type === "incoming_call_ended") {
      await dismissIncomingCallAlert(incomingCall.call_id);
      return;
    }

    if (response.actionIdentifier !== "mark_read") {
      return;
    }

    const conversationId = Number(payloadData?.conversation_id);
    const messageId =
      payloadData?.message_id !== undefined
        ? Number(payloadData.message_id)
        : undefined;

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return;
    }

    const token = await SecureStore.getItemAsync(
      "auth_token",
      TOKEN_STORE_OPTIONS,
    );

    if (!token) {
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      return;
    }

    try {
      const readResponse = await fetch(
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

      if (!readResponse.ok) {
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
