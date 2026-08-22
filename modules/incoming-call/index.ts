import { requireNativeModule } from "expo";
import { Platform } from "react-native";

export type IncomingCallDisplayOptions = {
  callId: string;
  callerId: number;
  callerName: string;
  callerAvatar?: string | null;
  callType?: string;
  timestamp?: number;
};

export type IncomingCallConfigureOptions = {
  token?: string | null;
  socketUrl?: string | null;
};

type IncomingCallNativeModule = {
  configure(options: IncomingCallConfigureOptions): Promise<void>;
  display(options: IncomingCallDisplayOptions): Promise<void>;
  dismiss(callId: string): Promise<void>;
  dismissAll(): Promise<void>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
  setForeground(isForeground: boolean): Promise<void>;
  consumeLaunchAction(): Promise<IncomingCallLaunchAction | null>;
  startOngoingCall(options: IncomingCallDisplayOptions): Promise<void>;
  stopOngoingCall(): Promise<void>;
  addListener?(
    eventName: "onLaunchAction",
    listener: (event: IncomingCallLaunchAction) => void,
  ): { remove(): void };
};

export type IncomingCallLaunchAction = {
  callId: string;
  action: string;
  callerId?: number;
  callerName?: string | null;
  callerAvatar?: string | null;
  callType?: string | null;
  timestamp?: number | null;
};

function loadNativeModule(): IncomingCallNativeModule | null {
  if (Platform.OS !== "android") {
    return null;
  }

  try {
    return requireNativeModule<IncomingCallNativeModule>("IncomingCall");
  } catch {
    return null;
  }
}

const nativeModule = loadNativeModule();

export async function configureIncomingCallNative(
  options: IncomingCallConfigureOptions,
): Promise<void> {
  await nativeModule?.configure(options);
}

export async function displayIncomingCallNative(
  options: IncomingCallDisplayOptions,
): Promise<void> {
  await nativeModule?.display(options);
}

export async function dismissIncomingCallNative(callId: string): Promise<void> {
  await nativeModule?.dismiss(callId);
}

export async function dismissAllIncomingCallsNative(): Promise<void> {
  await nativeModule?.dismissAll();
}

export async function canUseFullScreenIntent(): Promise<boolean> {
  if (!nativeModule) {
    return true;
  }

  return nativeModule.canUseFullScreenIntent();
}

export async function openFullScreenIntentSettings(): Promise<void> {
  await nativeModule?.openFullScreenIntentSettings();
}

export async function setIncomingCallNativeForeground(
  isForeground: boolean,
): Promise<void> {
  await nativeModule?.setForeground(isForeground);
}

export async function consumeIncomingCallLaunchNative(): Promise<IncomingCallLaunchAction | null> {
  if (!nativeModule) {
    return null;
  }

  return nativeModule.consumeLaunchAction();
}

export async function startOngoingCallNative(
  options: IncomingCallDisplayOptions,
): Promise<void> {
  await nativeModule?.startOngoingCall?.(options);
}

export async function stopOngoingCallNative(): Promise<void> {
  await nativeModule?.stopOngoingCall?.();
}

export function subscribeIncomingCallLaunchNative(
  listener: (launch: IncomingCallLaunchAction) => void,
): () => void {
  const subscription = nativeModule?.addListener?.("onLaunchAction", listener);
  return () => subscription?.remove();
}
