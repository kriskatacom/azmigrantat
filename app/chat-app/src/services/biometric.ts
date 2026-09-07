import { authenticateDeviceCredentialNative } from "../../modules/device-lock";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getDeviceLockCapability(): Promise<{
  hasFingerprint: boolean;
  hasFace: boolean;
  hasDeviceSecret: boolean;
}> {
  if (Platform.OS === "web") {
    return {
      hasFingerprint: false,
      hasFace: false,
      hasDeviceSecret: false,
    };
  }

  const [level, enrolled, types] = await Promise.all([
    LocalAuthentication.getEnrolledLevelAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  const hasDeviceSecret = level >= LocalAuthentication.SecurityLevel.SECRET;
  const hasFingerprint =
    enrolled &&
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasFace =
    enrolled &&
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

  return {
    hasFingerprint,
    hasFace,
    hasDeviceSecret,
  };
}

export async function isFingerprintAvailable(): Promise<boolean> {
  return (await getDeviceLockCapability()).hasFingerprint;
}

export async function isDeviceUnlockAvailable(): Promise<boolean> {
  const capability = await getDeviceLockCapability();
  return capability.hasDeviceSecret || capability.hasFace;
}

export async function authenticateFingerprint(
  promptMessage = "Потвърдете с отпечатък",
): Promise<boolean> {
  if (!(await isFingerprintAvailable())) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptDescription: "Използвайте пръстовия отпечатък на телефона.",
    cancelLabel: "Отказ",
    disableDeviceFallback: true,
    requireConfirmation: false,
  });

  return result.success;
}

export async function authenticateDeviceUnlock(
  promptMessage = "Отключете телефона, за да влезете",
): Promise<boolean> {
  if (!(await isDeviceUnlockAvailable())) {
    return false;
  }

  const nativeResult = await authenticateDeviceCredentialNative(
    promptMessage,
    "Заключване на телефона",
    "Въведете PIN, фигура, парола или използвайте лицево разпознаване.",
  );

  if (nativeResult !== null) {
    return nativeResult;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptDescription:
      "Въведете PIN, фигура, парола или използвайте лицево разпознаване.",
    cancelLabel: "Отказ",
    fallbackLabel: "PIN или парола",
    disableDeviceFallback: false,
    requireConfirmation: false,
  });

  return result.success;
}

/** Confirm the current user for sensitive profile actions. */
export async function authenticateCurrentUser(
  promptMessage = "Потвърдете, за да продължите",
): Promise<boolean> {
  if (await isFingerprintAvailable()) {
    const fingerprint = await authenticateFingerprint(promptMessage);

    if (fingerprint) {
      return true;
    }

    await wait(250);
  }

  return authenticateDeviceUnlock(promptMessage);
}
