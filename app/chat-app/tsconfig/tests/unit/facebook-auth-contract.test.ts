import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateRuntimeEnvironment } from "../../../src/config/environment-contract";

const eas = JSON.parse(readFileSync("../eas.json", "utf8")) as {
  build: Record<string, { env?: Record<string, string> }>;
};
const config = readFileSync("../app.config.js", "utf8");
const sdk = readFileSync("../src/services/facebook-sdk.ts", "utf8");
const button = readFileSync("../src/components/auth/facebook-login-button.tsx", "utf8");
const auth = readFileSync("../src/services/auth.ts", "utf8");
const backendController = readFileSync(
  "../../../auth/app/Controllers/Api/MobileAuthController.php",
  "utf8",
);
const backendVerifier = readFileSync(
  "../../../auth/app/Services/FacebookTokenVerifier.php",
  "utf8",
);
const backendFeature = readFileSync(
  "../../../auth/app/Services/FacebookAuthFeature.php",
  "utf8",
);

describe("Facebook authentication release contract", () => {
  it("locks every shared-production EAS profile", () => {
    expect(eas.build.development.env?.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN).toBe("false");
    expect(eas.build.staging.env?.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN).toBe("false");
    expect(eas.build.production.env?.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN).toBe("false");
  });

  it("requires a build-time client token and disables tracking collection", () => {
    expect(config).toContain("FACEBOOK_CLIENT_TOKEN is required");
    expect(config).toContain('EXPO_PUBLIC_APP_ENV !== "development"');
    expect(config).toContain("FACEBOOK_NATIVE_DEBUG_BUILD=true");
    expect(config).toContain("advertiserIDCollectionEnabled: false");
    expect(config).toContain("autoLogAppEventsEnabled: false");
  });

  it("does not load the native SDK until an enabled action is requested", () => {
    expect(sdk).toContain('await import(\n    "react-native-fbsdk-next"');
    expect(sdk).toContain("if (!FACEBOOK_ENABLED)");
    expect(sdk).toContain("__DEV__");
    expect(button).toContain("Facebook вход — предстои");
  });

  it("accepts only an isolated local auth API and dedicated client", () => {
    const base = {
      appEnvironment: "development",
      apiUrl: "https://users-dev.example.test",
      businessUrl: "https://business.azmigrantat.com",
      subscriptionsUrl: "https://users.azmigrantat.com/subscriptions",
      socketUrl: "https://realtime.azmigrantat.com",
      videoUrl: "https://video.azmigrantat.com",
      clientId: "dedicated-facebook-development-client",
      googleWebClientId: "149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com",
      googleSignInEnabled: "true",
      facebookSignInEnabled: "true",
      pushNotificationsEnabled: "true",
      forceTurn: "false",
      liveMediaProvider: "mediasoup",
      homeVideoFeedDisabled: "false",
      paymentsEnabled: "false",
    };
    expect(validateRuntimeEnvironment(base)).toEqual([]);
    expect(validateRuntimeEnvironment({
      ...base,
      apiUrl: "https://users.azmigrantat.com",
      clientId: "app_hpte5xcxll63",
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("отделен auth API"),
      expect.stringContaining("отделен OAuth client ID"),
    ]));
    expect(validateRuntimeEnvironment({
      ...base,
      appEnvironment: "production",
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("само в development"),
    ]));
    for (const apiUrl of [
      "https://USERS.AZMIGRANTAT.COM",
      "https://users.azmigrantat.com:443",
      "https://user:pass@users.azmigrantat.com",
      "https://users.azmigrantat.com/other",
    ]) {
      expect(validateRuntimeEnvironment({ ...base, apiUrl })).toEqual(
        expect.arrayContaining([expect.stringContaining("отделен auth API")]),
      );
    }
  });

  it("preserves backend error codes for safe linking UX", () => {
    expect(auth).toContain("readonly code: string | null");
    expect(button).toContain('error.code === "facebook_link_required"');
  });

  it("keeps backend auth deny-by-default and requires step-up linking", () => {
    expect(backendFeature).toContain("?: 'false'");
    expect(backendFeature).toContain("environment !== 'development'");
    expect(backendFeature).toContain("FACEBOOK_ALLOWED_CLIENT_IDS");
    expect(backendController).toContain("'facebook_link_required'");
    expect(backendController).toContain("User::withTrashed()");
    expect(backendController).toContain("password_verify");
  });

  it("validates Meta tokens without logging credentials", () => {
    expect(backendVerifier).toContain("hash_equals($appId");
    expect(backendVerifier).toContain("data_access_expires_at");
    expect(backendVerifier).toContain("$expiresAt <= time()");
    expect(backendVerifier).toContain("CURLOPT_CONNECTTIMEOUT");
    expect(backendVerifier).toContain("MAX_RESPONSE_BYTES");
    expect(backendVerifier).toContain("appsecret_proof");
    expect(backendVerifier).not.toContain("error_log");
  });
});
