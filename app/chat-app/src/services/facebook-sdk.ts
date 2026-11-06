const FACEBOOK_ENABLED =
  __DEV__ &&
  process.env.EXPO_PUBLIC_APP_ENV === "development" &&
  process.env.EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN === "true";

export function isFacebookSignInEnabled(): boolean {
  return FACEBOOK_ENABLED;
}

export async function requestFacebookAccessToken(): Promise<string | null> {
  if (!FACEBOOK_ENABLED) {
    throw new Error("Facebook входът още не е активиран за тази версия.");
  }

  const { AccessToken, LoginManager, Settings } = await import(
    "react-native-fbsdk-next"
  );
  Settings.initializeSDK();
  LoginManager.logOut();

  const result = await LoginManager.logInWithPermissions([
    "public_profile",
    "email",
  ]);
  if (result.isCancelled) return null;

  const access = await AccessToken.getCurrentAccessToken();
  if (!access?.accessToken) {
    throw new Error("Facebook не върна валидна сесия.");
  }

  return access.accessToken;
}
