import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SHARED_VALUES = {
  EXPO_PUBLIC_API_URL: "https://users.azmigrantat.com",
  EXPO_PUBLIC_BUSINESS_API_URL: "https://business.azmigrantat.com",
  EXPO_PUBLIC_SUBSCRIPTIONS_URL: "https://users.azmigrantat.com/subscriptions",
  EXPO_PUBLIC_SOCKET_URL: "https://realtime.azmigrantat.com",
  EXPO_PUBLIC_VIDEO_SERVICE_URL: "https://video.azmigrantat.com",
};

export const PRODUCTION_GOOGLE_CLIENT_ID =
  "149310026747-0276747vvqrhrgapqcqlg9o1uekn2snr.apps.googleusercontent.com";
const SHARED_OAUTH_CLIENT_ID = "app_hpte5xcxll63";
const GOOGLE_SERVICES_SHA256 =
  "cec62b2bdf82207122386b95d26c305b20648e73208fee33e2443f37f686d86f";
const REQUIRED_ANDROID_SHA1_CERTIFICATES = [
  // Local development keystore.
  "219f2aa5cfa107939c3f1ccc961fddafbbbdfbd2",
  // Existing EAS upload keystore.
  "ab5552059a8dfccd0eb7c17daa0fa803271665fd",
  // Google Play App Signing certificate.
  "9d32fac58265d830e8a400fde4cfecdf00f06737",
];

function resolvedProfile(eas, name) {
  const profile = eas.build[name];
  if (!profile) throw new Error(`Unknown EAS build profile: ${name}`);
  if (!profile.extends) return profile;
  const parent = resolvedProfile(eas, profile.extends);
  return { ...parent, ...profile, env: { ...(parent.env ?? {}), ...(profile.env ?? {}) } };
}

export function validateEnvironment(profileName, values) {
  const errors = [];

  for (const [name, expectedEndpoint] of Object.entries(SHARED_VALUES)) {
    if (values[name] !== expectedEndpoint) {
      errors.push(`${name} must exactly match the shared production service.`);
    }
  }

  const expectedAppEnv = profileName === "production"
    ? "production"
    : profileName === "development" ? "development" : "staging";
  if (values.EXPO_PUBLIC_APP_ENV !== expectedAppEnv) {
    errors.push(`EXPO_PUBLIC_APP_ENV must be ${expectedAppEnv}.`);
  }

  if (values.EXPO_PUBLIC_CLIENT_ID !== SHARED_OAUTH_CLIENT_ID) {
    errors.push("EXPO_PUBLIC_CLIENT_ID does not match the shared production OAuth client.");
  }

  const googleClientId = values.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const expectedGoogleSetting = "true";
  if (values.EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN !== expectedGoogleSetting) {
    errors.push(`EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN must be ${expectedGoogleSetting}.`);
  }

  // All EAS profiles currently share the production API and OAuth client, so
  // Facebook stays locked even in the development client. Local development
  // may opt in only with a separate backend/client configuration.
  const expectedFacebookSetting = "false";
  if (values.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN !== expectedFacebookSetting) {
    errors.push(`EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN must be ${expectedFacebookSetting}.`);
  }
  if (values.EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN === "true" && !googleClientId?.trim()) {
    errors.push("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required.");
  } else if (googleClientId !== PRODUCTION_GOOGLE_CLIENT_ID) {
    errors.push("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID does not match the shared production Google client.");
  }

  if (values.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS !== "true") {
    errors.push("EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS must be true in shared mode.");
  }
  if (values.EXPO_PUBLIC_FORCE_TURN !== "false") {
    errors.push("EXPO_PUBLIC_FORCE_TURN must be false in shared mode.");
  }
  if (values.EXPO_PUBLIC_LIVE_MEDIA_PROVIDER !== "mediasoup") {
    errors.push("EXPO_PUBLIC_LIVE_MEDIA_PROVIDER must be mediasoup in shared mode.");
  }
  if (values.EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED !== "false") {
    errors.push("EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED must be false in shared mode.");
  }
  if (values.EXPO_PUBLIC_ENABLE_PAYMENTS !== "false") {
    errors.push("EXPO_PUBLIC_ENABLE_PAYMENTS must be false for the first public release.");
  }

  return errors;
}

export function validateProfile(profileName, environment = process.env) {
  const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
  const profile = resolvedProfile(eas, profileName);
  const values = { ...(profile.env ?? {}) };
  const names = [
    ...Object.keys(SHARED_VALUES),
    "EXPO_PUBLIC_APP_ENV",
    "EXPO_PUBLIC_CLIENT_ID",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
    "EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS",
    "EXPO_PUBLIC_ENABLE_GOOGLE_SIGN_IN",
    "EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN",
    "EXPO_PUBLIC_FORCE_TURN",
    "EXPO_PUBLIC_LIVE_MEDIA_PROVIDER",
    "EXPO_PUBLIC_DISABLE_HOME_VIDEO_FEED",
    "EXPO_PUBLIC_ENABLE_PAYMENTS",
  ];
  for (const name of names) {
    if (environment[name] !== undefined) values[name] = environment[name];
  }
  const normalizedProfile = profileName === "preview" ? "staging" : profileName;
  const errors = validateEnvironment(normalizedProfile, values);

  const appConfig = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
  const androidPackage = appConfig.expo?.android?.package;
  if (androidPackage !== "com.etome.app") {
    errors.push("Android package does not match the shared production Google app.");
  }
  if (appConfig.expo?.android?.googleServicesFile !== "./google-services.json") {
    errors.push("Android googleServicesFile must use the shared production file.");
  }

  const googleServicesRaw = readFileSync(
    new URL("../google-services.json", import.meta.url),
    "utf8",
  );
  const googleServicesHash = createHash("sha256").update(googleServicesRaw).digest("hex");
  if (googleServicesHash !== GOOGLE_SERVICES_SHA256) {
    errors.push("google-services.json does not match the pinned production configuration.");
  }
  const googleServices = JSON.parse(googleServicesRaw);
  const nativeClient = googleServices.client?.find(
    (client) => client.client_info?.android_client_info?.package_name === androidPackage,
  );
  const oauthClients = nativeClient?.oauth_client ?? [];
  const registeredAndroidSha1 = new Set(
    oauthClients
      .filter((client) => client.client_type === 1)
      .map((client) => client.android_info?.certificate_hash?.toLowerCase())
      .filter(Boolean),
  );
  for (const certificateHash of REQUIRED_ANDROID_SHA1_CERTIFICATES) {
    if (!registeredAndroidSha1.has(certificateHash)) {
      errors.push(
        `google-services.json is missing required Android SHA-1 ${certificateHash}.`,
      );
    }
  }
  if (!oauthClients.some((client) =>
    client.client_type === 3 && client.client_id === PRODUCTION_GOOGLE_CLIENT_ID
  )) {
    errors.push("google-services.json Web client does not match the shared Google audience.");
  }

  // EAS runs the pre-install hook before managed prebuild creates the ignored
  // android/ directory. app.json and google-services.json remain mandatory
  // above; validate Gradle as an additional local/bare-workflow guard only.
  const gradleUrl = new URL("../android/app/build.gradle", import.meta.url);
  if (existsSync(gradleUrl)) {
    const gradle = readFileSync(gradleUrl, "utf8");
    const gradleWithoutComments = gradle
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const namespaces = [...gradleWithoutComments.matchAll(/\bnamespace\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);
    const applicationIds = [...gradleWithoutComments.matchAll(/\bapplicationId\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);
    if (namespaces.length !== 1 || namespaces[0] !== "com.etome.app" ||
        applicationIds.length !== 1 || applicationIds[0] !== "com.etome.app") {
      errors.push("Native Android Gradle package does not match the shared production app.");
    }
  }

  return errors;
}

function main() {
  const argumentIndex = process.argv.indexOf("--profile");
  const profileName = process.env.EAS_BUILD_PROFILE ||
    (argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined);
  if (!profileName) throw new Error("EAS_BUILD_PROFILE or --profile is required.");
  const errors = validateProfile(profileName);
  if (errors.length > 0) {
    console.error(`Environment validation failed for ${profileName}:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Environment validation passed for ${profileName}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
