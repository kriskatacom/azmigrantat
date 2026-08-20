import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  canUseFullScreenIntent,
  configureIncomingCallNative,
  consumeIncomingCallLaunchNative,
  dismissAllIncomingCallsNative,
  dismissIncomingCallNative,
  displayIncomingCallNative,
  setIncomingCallNativeForeground,
  subscribeIncomingCallLaunchNative,
} from "../../modules/incoming-call";

import type { CallServerPayload } from "@/services/video-call";

export const INCOMING_CALL_CATEGORY = "incoming_call";
export const INCOMING_CALL_CHANNEL = "incoming_calls";
export const INCOMING_CALL_ACCEPT_ACTION = "incoming_call_accept";
export const INCOMING_CALL_DECLINE_ACTION = "incoming_call_decline";

export type IncomingCallAction = "accept" | "open" | "decline";

export type IncomingCallPushData = {
  type: "incoming_call" | "incoming_call_ended";
  call_id: string;
  caller_id: number;
  caller_name?: string;
  caller_avatar?: string | null;
  call_type?: "video";
  timestamp?: number;
  reason?: string;
};

export type PendingIncomingCallAction = {
  callId: string;
  action: IncomingCallAction;
  meta: IncomingCallPushData;
};

const handledEvents = new Map<string, number>();
const pendingActionListeners = new Set<
  (value: PendingIncomingCallAction | null) => void
>();

let pendingAction: PendingIncomingCallAction | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

export function incomingCallNotificationId(callId: string): string {
  return `incomingcall${callId.replace(/[^a-zA-Z0-9]/g, "")}`;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function parseIncomingCallData(
  data: Record<string, unknown> | undefined | null,
): IncomingCallPushData | null {
  const record = asRecord(data);

  if (!record) {
    return null;
  }

  const type = asString(record.type);
  const callId = asString(record.call_id);

  const isIncoming = type === "incoming_call" || type === "incoming_video_call";
  const isEnded =
    type === "incoming_call_ended" ||
    type === "call_cancelled" ||
    type === "call_ended";

  if ((!isIncoming && !isEnded) || !callId) {
    return null;
  }

  const callerId = asNumber(record.caller_id) ?? 0;

  if (isIncoming && (!Number.isInteger(callerId) || callerId <= 0)) {
    return null;
  }

  return {
    type: isEnded ? "incoming_call_ended" : "incoming_call",
    call_id: callId,
    caller_id: callerId > 0 ? callerId : 0,
    caller_name: asString(record.caller_name),
    caller_avatar: asString(record.caller_avatar) ?? null,
    call_type: "video",
    timestamp: asNumber(record.timestamp),
    reason: asString(record.reason),
  };
}

export function parseIncomingCallUrl(
  url: string | null | undefined,
): PendingIncomingCallAction | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const isIncomingCall =
      parsed.hostname === "incoming-call" ||
      parsed.pathname.replace(/^\//, "") === "incoming-call";

    if (parsed.protocol !== "chatapp:" || !isIncomingCall) {
      return null;
    }

    const callId = parsed.searchParams.get("callId")?.trim();
    const action = parsed.searchParams.get("action")?.trim();
    const callerId = Number(parsed.searchParams.get("callerId")) || 0;
    const callerName = parsed.searchParams.get("callerName") ?? undefined;
    const callerAvatar = parsed.searchParams.get("callerAvatar");

    if (!callId) {
      return null;
    }

    const normalizedAction: IncomingCallAction =
      action === "accept" || action === "answer" || action === "decline"
        ? action === "decline"
          ? "decline"
          : "accept"
        : "open";

    return {
      callId,
      action: normalizedAction,
      meta: {
        type: "incoming_call",
        call_id: callId,
        caller_id: callerId,
        caller_name: callerName,
        caller_avatar: callerAvatar,
        call_type: "video",
      },
    };
  } catch {
    return null;
  }
}

export function rememberCallEvent(callId: string, event: string): boolean {
  const key = `${callId}:${event}`;
  const now = Date.now();
  const previous = handledEvents.get(key);

  if (previous && now - previous < 60_000) {
    return false;
  }

  handledEvents.set(key, now);
  return true;
}

export function getPendingIncomingCallAction(): PendingIncomingCallAction | null {
  return pendingAction;
}

export function setPendingIncomingCallAction(
  value: PendingIncomingCallAction | null,
): void {
  pendingAction = value;
  pendingActionListeners.forEach((listener) => listener(value));
}

export function consumePendingIncomingCallAction(
  callId?: string,
): PendingIncomingCallAction | null {
  if (!pendingAction) {
    return null;
  }

  if (callId && pendingAction.callId !== callId) {
    return null;
  }

  const current = pendingAction;
  setPendingIncomingCallAction(null);
  return current;
}

export function subscribePendingIncomingCallAction(
  listener: (value: PendingIncomingCallAction | null) => void,
): () => void {
  pendingActionListeners.add(listener);
  return () => {
    pendingActionListeners.delete(listener);
  };
}

export function toIncomingCallPayload(
  meta: IncomingCallPushData,
  extras?: Partial<CallServerPayload>,
): CallServerPayload {
  return {
    call_id: meta.call_id,
    sender_id: meta.caller_id,
    caller_name: meta.caller_name,
    caller_avatar: meta.caller_avatar,
    call_type: "video",
    timestamp: meta.timestamp,
    ...extras,
  };
}

export async function setupIncomingCallNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(INCOMING_CALL_CHANNEL, {
      name: "Входящи обаждания",
      importance: Notifications.AndroidImportance.MAX,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "incoming_call.wav",
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      enableVibrate: true,
    });
  }

  await Notifications.setNotificationCategoryAsync(INCOMING_CALL_CATEGORY, [
    {
      identifier: INCOMING_CALL_ACCEPT_ACTION,
      buttonTitle: "Приеми",
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: INCOMING_CALL_DECLINE_ACTION,
      buttonTitle: "Откажи",
      options: {
        opensAppToForeground: false,
        isDestructive: true,
        isAuthenticationRequired: false,
      },
    },
  ]);
}

export async function presentIncomingCallAlert(options: {
  callId: string;
  callerId: number;
  callerName?: string | null;
  callerAvatar?: string | null;
}): Promise<void> {
  if (Platform.OS === "android") {
    await displayIncomingCallNative({
      callId: options.callId,
      callerId: options.callerId,
      callerName: options.callerName?.trim() || "Потребител",
      callerAvatar: options.callerAvatar,
      callType: "video",
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: incomingCallNotificationId(options.callId),
    content: {
      title: options.callerName?.trim() || "Потребител",
      body: "Входящо видео обаждане",
      sound: "incoming_call.wav",
      categoryIdentifier: INCOMING_CALL_CATEGORY,
      interruptionLevel: "timeSensitive",
      data: {
        type: "incoming_call",
        call_id: options.callId,
        caller_id: options.callerId,
        caller_name: options.callerName,
        caller_avatar: options.callerAvatar,
        call_type: "video",
        timestamp: Date.now(),
      },
    },
    trigger: null,
  });
}

export async function dismissIncomingCallAlert(callId?: string): Promise<void> {
  if (callId) {
    await dismissIncomingCallNative(callId);

    try {
      await Notifications.dismissNotificationAsync(
        incomingCallNotificationId(callId),
      );
    } catch {
      // The Expo notification may already be gone.
    }
  } else {
    await dismissAllIncomingCallsNative();
  }

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();

    await Promise.all(
      presented
        .filter((notification) => {
          const data = parseIncomingCallData(
            notification.request.content.data as Record<string, unknown>,
          );

          if (!data) {
            return false;
          }

          return !callId || data.call_id === callId;
        })
        .map((notification) =>
          Notifications.dismissNotificationAsync(
            notification.request.identifier,
          ),
        ),
    );
  } catch {
    // Ignore dismiss failures while the app is in a headless state.
  }
}

export async function configureIncomingCallNativeSession(options: {
  token?: string | null;
  socketUrl?: string | null;
}): Promise<void> {
  await configureIncomingCallNative(options);
}

export async function setIncomingCallAppForeground(
  isForeground: boolean,
): Promise<void> {
  await setIncomingCallNativeForeground(isForeground);
}

export async function consumeNativeIncomingCallLaunch(): Promise<PendingIncomingCallAction | null> {
  const launch = await consumeIncomingCallLaunchNative();
  return toPendingNativeLaunch(launch);
}

export function subscribeNativeIncomingCallLaunch(
  listener: (value: PendingIncomingCallAction) => void,
): () => void {
  return subscribeIncomingCallLaunchNative((launch) => {
    const pending = toPendingNativeLaunch(launch);
    if (pending) {
      listener(pending);
    }
  });
}

function toPendingNativeLaunch(
  launch: {
    callId?: string;
    action?: string;
    callerId?: number;
    callerName?: string | null;
    callerAvatar?: string | null;
    timestamp?: number | null;
  } | null,
): PendingIncomingCallAction | null {
  if (!launch?.callId) {
    return null;
  }

  const action: IncomingCallAction =
    launch.action === "accept" ||
    launch.action === "answer" ||
    launch.action === "decline"
      ? launch.action === "decline"
        ? "decline"
        : "accept"
      : "open";

  return {
    callId: launch.callId,
    action,
    meta: {
      type: "incoming_call",
      call_id: launch.callId,
      caller_id: Number(launch.callerId) || 0,
      caller_name: launch.callerName ?? undefined,
      caller_avatar: launch.callerAvatar ?? null,
      call_type: "video",
      timestamp: launch.timestamp ? Number(launch.timestamp) : undefined,
    },
  };
}

export async function ensureFullScreenIncomingCallPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  return canUseFullScreenIntent();
}
