import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function registerForPushNotifications(
  accessToken: string,
): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Съобщения",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

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

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  console.log("Expo Push Token:", expoPushToken);

  await savePushToken(accessToken, expoPushToken);

  return expoPushToken;
}

async function savePushToken(
  accessToken: string,
  pushToken: string,
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
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ?? "Push token-ът не можа да бъде регистриран.",
    );
  }

  console.log("Push token saved:", data);
}
