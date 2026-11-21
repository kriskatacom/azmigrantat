import { requireNativeModule } from "expo";
import { Platform } from "react-native";

export type HardwareVolumeDirection = "up" | "down";

type HardwareVolumeEvent = {
  direction: HardwareVolumeDirection;
};

type VideoVolumeButtonsNativeModule = {
  setActive(active: boolean): void;
  addListener?(
    eventName: "onHardwareVolumeButton",
    listener: (event: HardwareVolumeEvent) => void,
  ): { remove(): void };
};

function loadNativeModule(): VideoVolumeButtonsNativeModule | null {
  if (Platform.OS !== "android") return null;

  try {
    return requireNativeModule<VideoVolumeButtonsNativeModule>("VideoVolumeButtons");
  } catch {
    return null;
  }
}

const nativeModule = loadNativeModule();
let activePlayerCount = 0;

function syncNativeActivation(): void {
  nativeModule?.setActive(activePlayerCount > 0);
}

/**
 * Keeps hardware interception active while at least one focused video is active.
 * The returned cleanup is idempotent so React lifecycle changes cannot underflow
 * the reference count or accidentally restore system-volume handling too early.
 */
export function activateVideoVolumeButtons(): () => void {
  if (!nativeModule) return () => undefined;

  activePlayerCount += 1;
  syncNativeActivation();
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activePlayerCount = Math.max(0, activePlayerCount - 1);
    syncNativeActivation();
  };
}

export function subscribeToVideoVolumeButtons(
  listener: (direction: HardwareVolumeDirection) => void,
): () => void {
  const subscription = nativeModule?.addListener?.(
    "onHardwareVolumeButton",
    ({ direction }) => listener(direction),
  );

  return () => subscription?.remove();
}
