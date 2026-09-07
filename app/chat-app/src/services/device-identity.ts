import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const UUID_KEY = "auth_device_uuid";
const LAST_EMAIL_KEY = "auth_last_email";
const DEVICE_SECRET_KEY = "auth_device_secret";
const FINGERPRINT_KEY = "auth_login_fingerprint";
const DEVICE_LOCK_KEY = "auth_login_device_lock";

export type DeviceIdentity = {
  device_uuid: string;
  platform: "android" | "ios";
  device_name: string;
};

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  let uuid = await SecureStore.getItemAsync(UUID_KEY);

  if (!uuid) {
    uuid = Crypto.randomUUID();
    await SecureStore.setItemAsync(UUID_KEY, uuid);
  }

  const name =
    [Device.manufacturer, Device.modelName].filter(Boolean).join(" ").trim() ||
    Device.deviceName ||
    Platform.OS;

  return {
    device_uuid: uuid,
    platform: Platform.OS === "ios" ? "ios" : "android",
    device_name: name.slice(0, 255),
  };
}

export async function getLastLoginEmail(): Promise<string | null> {
  const email = await SecureStore.getItemAsync(LAST_EMAIL_KEY);
  return email && email.includes("@") ? email : null;
}

export async function setLastLoginEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(LAST_EMAIL_KEY, email.trim().toLowerCase());
}

export async function getDeviceSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_SECRET_KEY);
}

export async function setDeviceSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret);
}

export async function clearDeviceSecret(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY);
}

export async function isFingerprintLoginEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(FINGERPRINT_KEY)) !== "0";
}

export async function setFingerprintLoginEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(FINGERPRINT_KEY, enabled ? "1" : "0");
}

export async function isDeviceLockLoginEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(DEVICE_LOCK_KEY)) !== "0";
}

export async function setDeviceLockLoginEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_LOCK_KEY, enabled ? "1" : "0");
}
