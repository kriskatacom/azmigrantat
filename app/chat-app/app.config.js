module.exports = ({ config }) => {
  const expo = { ...config, plugins: [...(config.plugins ?? [])] };
  const facebookEnabled = process.env.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN === "true";

  if (facebookEnabled) {
    if (process.env.EXPO_PUBLIC_APP_ENV !== "development") {
      throw new Error("Facebook Sign-In can only be enabled in a development build.");
    }
    if (process.env.FACEBOOK_NATIVE_DEBUG_BUILD !== "true") {
      throw new Error("FACEBOOK_NATIVE_DEBUG_BUILD=true is required for a Facebook development build.");
    }
    const clientToken = process.env.FACEBOOK_CLIENT_TOKEN?.trim();
    if (!clientToken) {
      throw new Error(
        "FACEBOOK_CLIENT_TOKEN is required when EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN=true.",
      );
    }

    expo.scheme = Array.isArray(expo.scheme)
      ? [...new Set([...expo.scheme, "fb1660811815677126"])]
      : [expo.scheme, "fb1660811815677126"].filter(Boolean);
    expo.plugins.push([
      "react-native-fbsdk-next",
      {
        appID: "1660811815677126",
        clientToken,
        displayName: "Ето ме",
        scheme: "fb1660811815677126",
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
        isAutoInitEnabled: false,
      },
    ]);
  }

  return expo;
};
