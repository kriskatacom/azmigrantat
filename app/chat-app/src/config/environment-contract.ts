export type EnvironmentValues = {
  appEnvironment?: string;
  apiUrl?: string;
  businessUrl?: string;
  subscriptionsUrl?: string;
  socketUrl?: string;
  videoUrl?: string;
  clientId?: string;
  googleWebClientId?: string;
  googleSignInEnabled?: string;
  pushNotificationsEnabled?: string;
  forceTurn?: string;
  liveMediaProvider?: string;
  homeVideoFeedDisabled?: string;
  paymentsEnabled?: string;
  facebookSignInEnabled?: string;
};

const SHARED_ENDPOINTS = {
  apiUrl: "https://users.azmigrantat.com",
  businessUrl: "https://business.azmigrantat.com",
  subscriptionsUrl: "https://users.azmigrantat.com/subscriptions",
  socketUrl: "https://realtime.azmigrantat.com",
  videoUrl: "https://video.azmigrantat.com",
} as const;

const SHARED_CLIENT_ID = "app_hpte5xcxll63";
const SHARED_GOOGLE_CLIENT_ID =
  "149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com";

export function validateRuntimeEnvironment(values: EnvironmentValues): string[] {
  const environment = values.appEnvironment;
  if (environment !== "development" && environment !== "staging" && environment !== "production") {
    return ["EXPO_PUBLIC_APP_ENV трябва да е development, staging или production."];
  }

  const errors: string[] = [];
  const isolatedFacebookDevelopment =
    environment === "development" && values.facebookSignInEnabled === "true";
  if (values.facebookSignInEnabled === "true" && environment !== "development") {
    errors.push("Facebook Sign-In може да се активира само в development среда.");
  }

  if (isolatedFacebookDevelopment) {
    if (!isIsolatedDevelopmentApiUrl(values.apiUrl)) {
      errors.push("Facebook development изисква отделен auth API, различен от production.");
    }
    if (!values.clientId || values.clientId === SHARED_CLIENT_ID) {
      errors.push("Facebook development изисква отделен OAuth client ID.");
    }
    for (const [name, expectedEndpoint] of Object.entries(SHARED_ENDPOINTS)) {
      if (name !== "apiUrl" && values[name as keyof typeof SHARED_ENDPOINTS] !== expectedEndpoint) {
        errors.push(`${name} трябва да съвпада точно с общата production услуга.`);
      }
    }
  } else {
    for (const [name, expectedEndpoint] of Object.entries(SHARED_ENDPOINTS)) {
      if (values[name as keyof typeof SHARED_ENDPOINTS] !== expectedEndpoint) {
        errors.push(`${name} трябва да съвпада точно с общата production услуга.`);
      }
    }
    if (values.clientId !== SHARED_CLIENT_ID) {
      errors.push("OAuth client ID не съответства на общата production конфигурация.");
    }
  }

  const googleClientId = values.googleWebClientId;
  const expectedGoogleSetting = "true";
  if (values.googleSignInEnabled !== expectedGoogleSetting) {
    errors.push(`Google Sign-In трябва да е ${expectedGoogleSetting} за тази среда.`);
  }
  if (values.googleSignInEnabled === "true" && !googleClientId?.trim()) {
    errors.push("Липсва Google OAuth client ID.");
  } else if (googleClientId !== SHARED_GOOGLE_CLIENT_ID) {
    errors.push("Google OAuth client ID не съответства на общата production конфигурация.");
  }
  if (values.pushNotificationsEnabled !== "true") {
    errors.push("Push notifications трябва да са true в общата конфигурация.");
  }
  if (values.forceTurn !== "false") {
    errors.push("EXPO_PUBLIC_FORCE_TURN трябва да е false в общата конфигурация.");
  }
  if (values.liveMediaProvider !== "mediasoup") {
    errors.push("EXPO_PUBLIC_LIVE_MEDIA_PROVIDER трябва да е mediasoup.");
  }
  if (values.homeVideoFeedDisabled !== "false") {
    errors.push("EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED трябва да е false.");
  }
  if (values.paymentsEnabled !== "false") {
    errors.push("EXPO_PUBLIC_ENABLE_PAYMENTS трябва да е false за първата публична версия.");
  }
  return errors;
}

export function urlMatchesOrigin(value: string, expectedBase: string): boolean {
  try {
    const actual = new URL(value);
    const expected = new URL(expectedBase);
    return actual.protocol === "https:" && actual.origin === expected.origin;
  } catch {
    return false;
  }
}

function isIsolatedDevelopmentApiUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const actual = new URL(value);
    const production = new URL(SHARED_ENDPOINTS.apiUrl);
    const localHost = actual.hostname === "localhost" || actual.hostname === "127.0.0.1";
    const safeProtocol = actual.protocol === "https:" || (localHost && actual.protocol === "http:");
    const basePathOnly = actual.pathname === "/" && !actual.search && !actual.hash;
    const noCredentials = !actual.username && !actual.password;

    return safeProtocol && basePathOnly && noCredentials && actual.origin !== production.origin;
  } catch {
    return false;
  }
}
