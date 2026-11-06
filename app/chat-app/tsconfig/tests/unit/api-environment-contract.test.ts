import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRODUCTION_GOOGLE_CLIENT_ID,
  validateProfile,
} from "../../../scripts/validate-environment.mjs";
import {
  urlMatchesOrigin,
  validateRuntimeEnvironment,
} from "../../../src/config/environment-contract";

const apiService = readFileSync("../src/services/api.ts", "utf8");
const googleLoginButton = readFileSync(
  "../src/components/auth/google-login-button.tsx",
  "utf8",
);
const environmentValidator = readFileSync("../scripts/validate-environment.mjs", "utf8");
const easConfig = JSON.parse(readFileSync("../eas.json", "utf8")) as {
  build: Record<string, { env?: Record<string, string>; extends?: string }>;
};

const sharedValues = {
  EXPO_PUBLIC_API_URL: "https://users.azmigrantat.com",
  EXPO_PUBLIC_BUSINESS_API_URL: "https://business.azmigrantat.com",
  EXPO_PUBLIC_SUBSCRIPTIONS_URL: "https://users.azmigrantat.com/subscriptions",
  EXPO_PUBLIC_SOCKET_URL: "https://realtime.azmigrantat.com",
  EXPO_PUBLIC_VIDEO_SERVICE_URL: "https://video.azmigrantat.com",
  EXPO_PUBLIC_CLIENT_ID: "app_hpte5xcxll63",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: PRODUCTION_GOOGLE_CLIENT_ID,
  EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN: "true",
  EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: "true",
  EXPO_PUBLIC_FORCE_TURN: "false",
  EXPO_PUBLIC_LIVE_MEDIA_PROVIDER: "mediasoup",
  EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED: "false",
  EXPO_PUBLIC_ENABLE_PAYMENTS: "false",
};

const sharedRuntimeValues = {
  appEnvironment: "development",
  apiUrl: sharedValues.EXPO_PUBLIC_API_URL,
  businessUrl: sharedValues.EXPO_PUBLIC_BUSINESS_API_URL,
  subscriptionsUrl: sharedValues.EXPO_PUBLIC_SUBSCRIPTIONS_URL,
  socketUrl: sharedValues.EXPO_PUBLIC_SOCKET_URL,
  videoUrl: sharedValues.EXPO_PUBLIC_VIDEO_SERVICE_URL,
  clientId: sharedValues.EXPO_PUBLIC_CLIENT_ID,
  googleWebClientId: sharedValues.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleSignInEnabled: "true",
  pushNotificationsEnabled: "true",
  forceTurn: "false",
  liveMediaProvider: "mediasoup",
  homeVideoFeedDisabled: "false",
  paymentsEnabled: "false",
};

describe("shared API environment contract", () => {
  it("uses the selected environment for shared API requests", () => {
    expect(apiService).toContain("process.env.EXPO_PUBLIC_API_URL");
    expect(apiService).not.toContain('API_URL = "https://users.azmigrantat.com"');
  });

  it("keeps Google runtime configuration env-driven and the button visible", () => {
    expect(googleLoginButton).toContain("process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
    expect(googleLoginButton).not.toContain(PRODUCTION_GOOGLE_CLIENT_ID);
    expect(googleLoginButton).not.toContain("return null");
  });

  it("uses the same production service and OAuth tuple in every build profile", () => {
    for (const profile of ["development", "staging", "production"] as const) {
      expect(easConfig.build[profile].env).toMatchObject(sharedValues);
      expect(validateProfile(profile, {})).toEqual([]);
    }
    expect(easConfig.build.preview.extends).toBe("staging");
    expect(validateProfile("preview", {})).toEqual([]);
  });

  it("supports the EAS managed pre-install phase before android prebuild exists", () => {
    expect(environmentValidator).toContain("existsSync(gradleUrl)");
    expect(environmentValidator).toContain("app.json and google-services.json remain mandatory");
  });

  it("blocks every build profile when its Google Web client is missing", () => {
    for (const profile of ["development", "staging", "preview", "production"] as const) {
      const errors = validateProfile(profile, {
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "",
      });
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
      ]));
    }
  });

  it("rejects a different Google audience or disabled shared push", () => {
    const errors = validateProfile("development", {
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "different.apps.googleusercontent.com",
      EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: "false",
    });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
      expect.stringContaining("EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS"),
    ]));

    expect(validateProfile("development", {
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: ` ${PRODUCTION_GOOGLE_CLIENT_ID}`,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
    ]));
    expect(validateRuntimeEnvironment({
      ...sharedRuntimeValues,
      googleWebClientId: `${PRODUCTION_GOOGLE_CLIENT_ID} `,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("Google OAuth client ID"),
    ]));
  });

  it("rejects drift in shared realtime and feed flags at build and runtime", () => {
    const buildErrors = validateProfile("development", {
      EXPO_PUBLIC_FORCE_TURN: "true",
      EXPO_PUBLIC_LIVE_MEDIA_PROVIDER: "mock",
      EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED: "true",
      EXPO_PUBLIC_ENABLE_PAYMENTS: "true",
    });
    expect(buildErrors).toEqual(expect.arrayContaining([
      expect.stringContaining("EXPO_PUBLIC_FORCE_TURN"),
      expect.stringContaining("EXPO_PUBLIC_LIVE_MEDIA_PROVIDER"),
      expect.stringContaining("EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED"),
      expect.stringContaining("EXPO_PUBLIC_ENABLE_PAYMENTS"),
    ]));

    const runtimeErrors = validateRuntimeEnvironment({
      ...sharedRuntimeValues,
      forceTurn: "true",
      liveMediaProvider: "mock",
      homeVideoFeedDisabled: "true",
      paymentsEnabled: "true",
    });
    expect(runtimeErrors).toEqual(expect.arrayContaining([
      expect.stringContaining("EXPO_PUBLIC_FORCE_TURN"),
      expect.stringContaining("EXPO_PUBLIC_LIVE_MEDIA_PROVIDER"),
      expect.stringContaining("EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED"),
      expect.stringContaining("EXPO_PUBLIC_ENABLE_PAYMENTS"),
    ]));
  });

  it("rejects the retired isolated staging tuple", () => {
    const errors = validateProfile("staging", {
      EXPO_PUBLIC_API_URL: "https://users-staging.azmigrantat.com",
      EXPO_PUBLIC_BUSINESS_API_URL: "https://business-staging.azmigrantat.com",
      EXPO_PUBLIC_SOCKET_URL: "https://realtime-staging.azmigrantat.com",
      EXPO_PUBLIC_CLIENT_ID: "azmigrantat-staging-mobile-a58df77b7f85a4db",
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "staging-test.apps.googleusercontent.com",
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("EXPO_PUBLIC_API_URL"),
      expect.stringContaining("EXPO_PUBLIC_BUSINESS_API_URL"),
      expect.stringContaining("EXPO_PUBLIC_SOCKET_URL"),
      expect.stringContaining("EXPO_PUBLIC_CLIENT_ID"),
      expect.stringContaining("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
    ]));
  });

  it("rejects lookalike hosts, ports, credentials, and wrong paths", () => {
    const cases = [
      "https://users.azmigrantat.com.evil.example",
      "https://users.azmigrantat.com:444",
      "https://users.azmigrantat.com:443",
      "https://user:password@users.azmigrantat.com",
      "https://users.azmigrantat.com/wrong",
      "https://users.azmigrantat.com?",
      "https://users.azmigrantat.com#",
      "https://users.azmigrantat.com/.",
      "https://users.azmigrantat.com/foo/..",
      " https://users.azmigrantat.com",
    ];
    for (const apiUrl of cases) {
      const errors = validateProfile("development", {
        EXPO_PUBLIC_API_URL: apiUrl,
      });
      expect(errors.some((error) => error.includes("EXPO_PUBLIC_API_URL"))).toBe(true);
      expect(validateRuntimeEnvironment({
        ...sharedRuntimeValues,
        apiUrl,
      }).some((error) => error.includes("apiUrl"))).toBe(true);
    }

    const subscriptionErrors = validateProfile("development", {
      EXPO_PUBLIC_SUBSCRIPTIONS_URL: "https://users.azmigrantat.com",
    });
    expect(subscriptionErrors.some((error) =>
      error.includes("EXPO_PUBLIC_SUBSCRIPTIONS_URL"),
    )).toBe(true);
  });

  it("accepts the shared tuple for a Metro development bundle", () => {
    expect(validateRuntimeEnvironment(sharedRuntimeValues)).toEqual([]);
  });

  it("accepts only dedicated upload URLs on the shared video origin", () => {
    expect(urlMatchesOrigin(
      "https://video.azmigrantat.com/files/upload-1",
      "https://video.azmigrantat.com",
    )).toBe(true);
    expect(urlMatchesOrigin(
      "https://video-staging.azmigrantat.com/files/upload-1",
      "https://video.azmigrantat.com",
    )).toBe(false);
    expect(urlMatchesOrigin(
      "https://video.azmigrantat.com.evil.example/files/upload-1",
      "https://video.azmigrantat.com",
    )).toBe(false);
  });
});
