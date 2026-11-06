import {
  urlMatchesOrigin,
  validateRuntimeEnvironment,
  type EnvironmentValues,
} from "./environment-contract";

export const runtimeEnvironmentValues: EnvironmentValues = {
  appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  businessUrl: process.env.EXPO_PUBLIC_BUSINESS_API_URL,
  subscriptionsUrl: process.env.EXPO_PUBLIC_SUBSCRIPTIONS_URL,
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
  videoUrl: process.env.EXPO_PUBLIC_VIDEO_SERVICE_URL,
  clientId: process.env.EXPO_PUBLIC_CLIENT_ID,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleSignInEnabled: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN,
  pushNotificationsEnabled: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS,
  forceTurn: process.env.EXPO_PUBLIC_FORCE_TURN,
  liveMediaProvider: process.env.EXPO_PUBLIC_LIVE_MEDIA_PROVIDER,
  homeVideoFeedDisabled: process.env.EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED,
  paymentsEnabled: process.env.EXPO_PUBLIC_ENABLE_PAYMENTS,
  facebookSignInEnabled: process.env.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN,
};

const runtimeErrors = validateRuntimeEnvironment(runtimeEnvironmentValues);
if (runtimeErrors.length > 0) {
  throw new Error(`Невалидна environment конфигурация:\n${runtimeErrors.join("\n")}`);
}

export const PAYMENTS_ENABLED = runtimeEnvironmentValues.paymentsEnabled === "true";

export function assertDedicatedVideoUrl(value: string): void {
  const expectedBase = runtimeEnvironmentValues.videoUrl;
  if (!expectedBase) throw new Error("Липсва EXPO_PUBLIC_VIDEO_SERVICE_URL.");
  if (!urlMatchesOrigin(value, expectedBase)) {
    throw new Error("Upload URL не съответства на конфигурирания video service.");
  }
}
