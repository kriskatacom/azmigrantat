import { authenticateDeviceCredentialNative } from "../../modules/device-lock";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ENABLED_KEY = "auth_biometric_enabled";
const CREDENTIALS_KEY = "auth_biometric_credentials";

export type BiometricCredentials = {
  email: string;
  password: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getDeviceLockCapability(): Promise<{
  hasBiometrics: boolean;
  hasDeviceSecret: boolean;
  canUseTwoStep: boolean;
}> {
  if (Platform.OS === "web") {
    return {
      hasBiometrics: false,
      hasDeviceSecret: false,
      canUseTwoStep: false,
    };
  }

  const [level, enrolled] = await Promise.all([
    LocalAuthentication.getEnrolledLevelAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  const hasDeviceSecret = level >= LocalAuthentication.SecurityLevel.SECRET;
  const hasBiometrics =
    enrolled || level >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;

  return {
    hasBiometrics,
    hasDeviceSecret,
    canUseTwoStep: hasBiometrics && hasDeviceSecret,
  };
}

export async function isBiometricSupported(): Promise<boolean> {
  return (await getDeviceLockCapability()).canUseTwoStep;
}

export async function getBiometricTypes(): Promise<
  LocalAuthentication.AuthenticationType[]
> {
  if (Platform.OS === "web") {
    return [];
  }

  return LocalAuthentication.supportedAuthenticationTypesAsync();
}

export function getBiometricLabel(
  _types: LocalAuthentication.AuthenticationType[] = [],
): string {
  return "биометрия и PIN";
}

async function authenticateBiometricsOnly(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptSubtitle: "Стъпка 1 от 2",
    promptDescription: "Потвърдете с пръстов отпечатък или лицево разпознаване.",
    cancelLabel: "Отказ",
    disableDeviceFallback: true,
    requireConfirmation: false,
  });

  return result.success;
}

async function authenticatePinOrPattern(promptMessage: string): Promise<boolean> {
  const nativeResult = await authenticateDeviceCredentialNative(
    promptMessage,
    "Стъпка 2 от 2",
    "Въведете PIN, фигура или паролата, с която отключвате телефона.",
  );

  if (nativeResult !== null) {
    return nativeResult;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptSubtitle: "Стъпка 2 от 2",
    promptDescription:
      "Въведете PIN, фигура или паролата, с която отключвате телефона.",
    cancelLabel: "Отказ",
    fallbackLabel: "PIN или парола",
    disableDeviceFallback: false,
    requireConfirmation: false,
  });

  return result.success;
}

export async function authenticateWithBiometrics(
  promptMessage = "Потвърдете, за да влезете",
): Promise<boolean> {
  const capability = await getDeviceLockCapability();

  if (!capability.canUseTwoStep) {
    return false;
  }

  const biometricsOk = await authenticateBiometricsOnly(
    `${promptMessage} — биометрия`,
  );

  if (!biometricsOk) {
    return false;
  }

  await wait(400);

  return authenticatePinOrPattern(`${promptMessage} — PIN, фигура или парола`);
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ENABLED_KEY)) === "1";
}

export async function setBiometricLoginEnabled(
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(ENABLED_KEY, "1");
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ENABLED_KEY),
    SecureStore.deleteItemAsync(CREDENTIALS_KEY),
  ]);
}

export async function saveBiometricCredentials(
  credentials: BiometricCredentials,
): Promise<void> {
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  );
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}

export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BiometricCredentials>;

    if (
      typeof parsed.email === "string" &&
      parsed.email.length > 0 &&
      typeof parsed.password === "string" &&
      parsed.password.length > 0
    ) {
      return {
        email: parsed.email.trim().toLowerCase(),
        password: parsed.password,
      };
    }
  } catch {
    return null;
  }

  return null;
}
