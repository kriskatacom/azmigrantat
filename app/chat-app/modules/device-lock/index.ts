import { requireNativeModule } from "expo";
import { Platform } from "react-native";

type DeviceLockNativeModule = {
  authenticateDeviceCredential(
    title: string,
    subtitle: string | null,
    description: string | null,
  ): Promise<boolean>;
};

function loadNativeModule(): DeviceLockNativeModule | null {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return requireNativeModule<DeviceLockNativeModule>("DeviceLock");
  } catch {
    return null;
  }
}

const nativeModule = loadNativeModule();

export async function authenticateDeviceCredentialNative(
  title: string,
  subtitle?: string,
  description?: string,
): Promise<boolean | null> {
  if (!nativeModule) {
    return null;
  }

  return nativeModule.authenticateDeviceCredential(
    title,
    subtitle ?? null,
    description ?? null,
  );
}
