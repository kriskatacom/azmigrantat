import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { setupIncomingCallNotifications } from "@/services/incoming-call";
import {
  getNotificationVibrationOptions,
  loadUserSettings,
} from "@/services/user-settings";
import {
  MISSED_CALL_CALLBACK_ACTION,
  MISSED_CALL_CATEGORY,
  MISSED_CALL_OPEN_CHAT_ACTION,
} from "@/types/notifications";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function registerForPushNotifications(
  accessToken: string,
): Promise<string | null> {
  if (Platform.OS === "android") {
    await loadUserSettings();
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Съобщения",
      importance: Notifications.AndroidImportance.MAX,
      ...getNotificationVibrationOptions(),
    });
  }

  await setupIncomingCallNotifications();

  await Notifications.setNotificationCategoryAsync(MISSED_CALL_CATEGORY, [
    {
      identifier: MISSED_CALL_CALLBACK_ACTION,
      buttonTitle: "Обади се",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: MISSED_CALL_OPEN_CHAT_ACTION,
      buttonTitle: "Към чата",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  const permissions = await Notifications.getPermissionsAsync();

  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();

    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error("EAS projectId не е намерен.");
  }

  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();

    if (typeof devicePushToken.data === "string" && devicePushToken.data) {
      await savePushToken(accessToken, devicePushToken.data, "fcm");
    }
  } catch (error: unknown) {
    console.error("FCM token за входящи обаждания не се регистрира:", error);
  }

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  console.log("Expo Push Token:", expoPushToken);

  await savePushToken(accessToken, expoPushToken, "expo");

  return expoPushToken;
}

async function savePushToken(
  accessToken: string,
  pushToken: string,
  provider: "fcm" | "expo",
): Promise<void> {
  if (!API_URL) {
    throw new Error("Липсва EXPO_PUBLIC_API_URL.");
  }

  const response = await fetch(`${API_URL}/api/mobile/push-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      token: pushToken,
      platform: Platform.OS,
      device_id: null,
      provider,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ?? "Push token-ът не можа да бъде регистриран.",
    );
  }

  console.log("Push token saved:", provider);
}
