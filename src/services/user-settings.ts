import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform, Vibration } from "react-native";

export type AppearancePreference = "system" | "light" | "dark";
export type ChatFontSize = "small" | "medium" | "large";

export type UserSettings = {
  vibrationEnabled: boolean;
  appearance: AppearancePreference;
  chatFontSize: ChatFontSize;
  phoneVisible: boolean;
};

const SETTINGS_KEY = "user_settings_v1";
const VIBRATION_KEY = "settings.vibration_enabled";

const MESSAGE_CHANNELS = [
  { id: "messages", name: "Съобщения" },
  { id: "chat-messages-v3", name: "Чат съобщения" },
] as const;

const INCOMING_CALL_CHANNEL_ID = "incoming_calls";
const VIBRATION_PATTERN = [0, 250, 250, 250] as const;
const CALL_VIBRATION_PATTERN = [0, 400, 200, 400, 200, 400] as const;

const DEFAULT_SETTINGS: UserSettings = {
  vibrationEnabled: true,
  appearance: "system",
  chatFontSize: "medium",
  phoneVisible: false,
};

let settings: UserSettings = { ...DEFAULT_SETTINGS };
let settingsWriteEpoch = 0;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getUserSettings(): UserSettings {
  return settings;
}

export function getVibrationEnabled(): boolean {
  return settings.vibrationEnabled;
}

export function getAppearancePreference(): AppearancePreference {
  return settings.appearance;
}

export function getChatFontSize(): ChatFontSize {
  return settings.chatFontSize;
}

export function getPhoneVisible(): boolean {
  return settings.phoneVisible;
}

export function subscribeUserSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeVibrationEnabled(listener: () => void): () => void {
  return subscribeUserSettings(listener);
}

export function getChatFontMetrics(size: ChatFontSize = settings.chatFontSize) {
  if (size === "small") {
    return {
      message: 13,
      messageLineHeight: 18,
      time: 9,
      date: 11,
      input: 14,
    };
  }

  if (size === "large") {
    return {
      message: 18,
      messageLineHeight: 24,
      time: 12,
      date: 14,
      input: 18,
    };
  }

  return {
    message: 15,
    messageLineHeight: 20,
    time: 10,
    date: 12,
    input: 15,
  };
}

export async function loadUserSettings(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const epoch = settingsWriteEpoch;
    const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
    const legacyVibration = await SecureStore.getItemAsync(VIBRATION_KEY);

    if (epoch !== settingsWriteEpoch) {
      return;
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;
        const storedVibration =
          typeof parsed.vibrationEnabled === "boolean"
            ? parsed.vibrationEnabled
            : legacyVibration !== "0";

        settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          vibrationEnabled: storedVibration,
          appearance: isAppearance(parsed.appearance)
            ? parsed.appearance
            : DEFAULT_SETTINGS.appearance,
          chatFontSize: isChatFontSize(parsed.chatFontSize)
            ? parsed.chatFontSize
            : DEFAULT_SETTINGS.chatFontSize,
          phoneVisible:
            typeof parsed.phoneVisible === "boolean"
              ? parsed.phoneVisible
              : DEFAULT_SETTINGS.phoneVisible,
        };
      } catch {
        settings = {
          ...DEFAULT_SETTINGS,
          vibrationEnabled: legacyVibration !== "0",
        };
      }
    } else {
      settings = {
        ...DEFAULT_SETTINGS,
        vibrationEnabled: legacyVibration !== "0",
      };
    }

    if (epoch !== settingsWriteEpoch) {
      return;
    }

    await applyNotificationChannelVibration(settings.vibrationEnabled);
    emit();
  })().catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

export async function setVibrationEnabled(enabled: boolean): Promise<void> {
  if (!enabled) {
    Vibration.cancel();
  }

  await patchSettings({ vibrationEnabled: enabled });
  await SecureStore.setItemAsync(VIBRATION_KEY, enabled ? "1" : "0");
  await applyNotificationChannelVibration(enabled);
}

export async function setAppearancePreference(
  appearance: AppearancePreference,
): Promise<void> {
  await patchSettings({ appearance });
}

export async function setChatFontSize(chatFontSize: ChatFontSize): Promise<void> {
  await patchSettings({ chatFontSize });
}

export async function setPhoneVisible(phoneVisible: boolean): Promise<void> {
  await patchSettings({ phoneVisible });
}

export function getNotificationVibrationOptions(): {
  enableVibrate: boolean;
  vibrationPattern: number[];
} {
  return settings.vibrationEnabled
    ? { enableVibrate: true, vibrationPattern: [...VIBRATION_PATTERN] }
    : { enableVibrate: false, vibrationPattern: [] };
}

export function getCallNotificationVibrationOptions(): {
  enableVibrate: boolean;
  vibrationPattern: number[];
} {
  return settings.vibrationEnabled
    ? { enableVibrate: true, vibrationPattern: [...CALL_VIBRATION_PATTERN] }
    : { enableVibrate: false, vibrationPattern: [] };
}

export function vibrateForIncomingAlert(): void {
  if (!settings.vibrationEnabled) {
    return;
  }

  Vibration.vibrate(Platform.OS === "android" ? 250 : 400);
}

async function patchSettings(patch: Partial<UserSettings>): Promise<void> {
  settingsWriteEpoch += 1;
  settings = { ...settings, ...patch };
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
  emit();
}

function isAppearance(value: unknown): value is AppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isChatFontSize(value: unknown): value is ChatFontSize {
  return value === "small" || value === "medium" || value === "large";
}

async function applyNotificationChannelVibration(
  enabled: boolean,
): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const vibration = enabled
    ? { enableVibrate: true, vibrationPattern: [...VIBRATION_PATTERN] }
    : { enableVibrate: false, vibrationPattern: [] as number[] };
  const callVibration = enabled
    ? { enableVibrate: true, vibrationPattern: [...CALL_VIBRATION_PATTERN] }
    : { enableVibrate: false, vibrationPattern: [] as number[] };

  for (const channel of MESSAGE_CHANNELS) {
    await replaceNotificationChannel(channel.id, {
      name: channel.name,
      importance: Notifications.AndroidImportance.MAX,
      ...vibration,
    });
  }

  await replaceNotificationChannel(INCOMING_CALL_CHANNEL_ID, {
    name: "Входящи обаждания",
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: "incoming_call.wav",
    ...callVibration,
  });
}

async function replaceNotificationChannel(
  channelId: string,
  channel: Notifications.NotificationChannelInput,
): Promise<void> {
  try {
    await Notifications.deleteNotificationChannelAsync(channelId);
  } catch {
    // Channel may not exist yet.
  }

  await Notifications.setNotificationChannelAsync(channelId, channel);
}
