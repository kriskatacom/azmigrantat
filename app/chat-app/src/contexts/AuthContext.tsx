import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  completeDevicePendingRequest,
  completeEmailLoginRequest,
  completeTotpLoginRequest,
  deviceSecretLoginRequest,
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  pinLoginRequest,
  refreshRequest,
  registerRequest,
  setEmailLoginEnabledRequest,
  setPinLoginEnabledRequest,
  verifyDeviceEmailCodeRequest,
} from "@/services/auth";
import { applyLocalPhoneVisible } from "@/services/user-settings";
import {
  authenticateDeviceUnlock,
  authenticateFingerprint,
  isDeviceUnlockAvailable,
  isFingerprintAvailable,
} from "@/services/biometric";
import {
  clearDeviceSecret,
  getDeviceSecret,
  getLastLoginEmail,
  isDeviceLockLoginEnabled,
  isFingerprintLoginEnabled,
  setDeviceLockLoginEnabled,
  setDeviceSecret,
  setFingerprintLoginEnabled,
  setLastLoginEmail,
} from "@/services/device-identity";

import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "@/services/notifications";
import { configureIncomingCallNativeSession } from "@/services/incoming-call";
import { isNetworkError, toNetworkError } from "@/services/network-guard";
import { getRealtimeHttpUrl } from "@/services/realtime-http";
import { bindAuthSessionHandlers } from "@/services/session-http";
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";
import { toPublicFileUrl } from "@/utils/public-file-url";

const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";
const EXPIRES_AT_KEY = "auth_expires_at";
const REFRESH_SKEW_MS = 60 * 60 * 1000;
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

async function readStore(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, STORE_OPTIONS);
}

async function writeStore(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, STORE_OPTIONS);
}

async function deleteStore(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, STORE_OPTIONS);
}

function withPublicUserMedia(user: AuthUser): AuthUser {
  return {
    ...user,
    profile_image: toPublicFileUrl(user.profile_image) ?? user.profile_image,
    cover_image: toPublicFileUrl(user.cover_image) ?? user.cover_image,
    avatar: toPublicFileUrl(user.avatar) ?? user.avatar,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastLoginEmail: string | null;
  hasDeviceSecret: boolean;
  hasPin: boolean;
  pinLoginEnabled: boolean;
  emailLoginEnabled: boolean;
  fingerprintAvailable: boolean;
  deviceUnlockAvailable: boolean;
  fingerprintLoginEnabled: boolean;
  deviceLockLoginEnabled: boolean;
  canUseFingerprintLogin: boolean;
  canUseDeviceLockLogin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<void>;
  loginWithPin: (pin: string, rememberMe?: boolean) => Promise<void>;
  loginWithFingerprint: (rememberMe?: boolean) => Promise<void>;
  loginWithDeviceLock: (rememberMe?: boolean) => Promise<void>;
  completeTotpLogin: (pendingToken: string, code: string) => Promise<void>;
  completeDevicePending: (pendingToken: string) => Promise<void>;
  completeDeviceEmailCode: (pendingToken: string, code: string) => Promise<void>;
  completeEmailLogin: (pendingToken: string, code: string) => Promise<void>;
  setFingerprintLoginEnabledFlag: (enabled: boolean) => Promise<void>;
  setDeviceLockLoginEnabledFlag: (enabled: boolean) => Promise<void>;
  setPinLoginEnabledFlag: (enabled: boolean) => Promise<void>;
  setEmailLoginEnabledFlag: (enabled: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  endLocalSession: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  clearLocalQuickLogin: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

function applyNativeSession(accessToken: string): void {
  void configureIncomingCallNativeSession({
    token: accessToken,
    socketUrl: getRealtimeHttpUrl(),
  }).catch((error: unknown) => {
    console.error("Native incoming call session не се настрои:", error);
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoginEmail, setLastLoginEmailState] = useState<string | null>(null);
  const [hasDeviceSecret, setHasDeviceSecret] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);
  const [fingerprintLoginEnabled, setFingerprintEnabled] = useState(true);
  const [deviceLockLoginEnabled, setDeviceLockEnabled] = useState(true);
  const loggingOutRef = useRef(false);

  const syncLocalLoginAvailability = useCallback(async () => {
    const [secret, email, fingerprint, unlock, fingerprintOn, lockOn] =
      await Promise.all([
        getDeviceSecret(),
        getLastLoginEmail(),
        isFingerprintAvailable(),
        isDeviceUnlockAvailable(),
        isFingerprintLoginEnabled(),
        isDeviceLockLoginEnabled(),
      ]);

    setHasDeviceSecret(Boolean(secret));
    setLastLoginEmailState(email);
    setFingerprintAvailable(fingerprint);
    setDeviceUnlockAvailable(unlock);
    setFingerprintEnabled(fingerprintOn);
    setDeviceLockEnabled(lockOn);
  }, []);

  const clearLocalSession = useCallback(async () => {
    await Promise.all([
      deleteStore(TOKEN_KEY),
      deleteStore(REFRESH_KEY),
      deleteStore(USER_KEY),
      deleteStore(EXPIRES_AT_KEY),
      configureIncomingCallNativeSession({
        token: null,
        socketUrl: null,
      }),
    ]);

    setToken(null);
    setUser(null);
    setExpiresAt(null);
    setHasPin(false);
  }, []);

  const saveSession = useCallback(
    async (
      newToken: string,
      newUser: AuthUser,
      expiresIn: number,
      refreshToken: string | null,
    ) => {
      const newExpiresAt = Date.now() + expiresIn * 1000;
      const publicUser = withPublicUserMedia(newUser);
      const persist = [
        writeStore(TOKEN_KEY, newToken),
        writeStore(USER_KEY, JSON.stringify(publicUser)),
        writeStore(EXPIRES_AT_KEY, newExpiresAt.toString()),
      ];

      if (refreshToken) {
        persist.push(writeStore(REFRESH_KEY, refreshToken));
      } else {
        persist.push(deleteStore(REFRESH_KEY));
      }

      await Promise.all(persist);

      setToken(newToken);
      setUser(publicUser);
      setExpiresAt(newExpiresAt);
      setHasPin(Boolean(publicUser.has_pin));
      applyNativeSession(newToken);
      loggingOutRef.current = false;
    },
    [],
  );

  const refreshFromStore = useCallback(async (): Promise<string | null> => {
    const storedRefresh = await readStore(REFRESH_KEY);

    if (!storedRefresh) {
      return null;
    }

    try {
      const response = await refreshRequest(storedRefresh);
      await saveSession(
        response.token,
        response.user,
        response.expiresIn,
        response.refreshToken,
      );
      return response.token;
    } catch (error) {
      if (isNetworkError(error)) {
        throw toNetworkError(error);
      }

      console.error("Неуспешно подновяване на сесията:", error);
      await clearLocalSession();
      await syncLocalLoginAvailability();
      return null;
    }
  }, [saveSession, clearLocalSession, syncLocalLoginAvailability]);

  const hydrateStoredSession = useCallback(async (): Promise<boolean> => {
    const [storedToken, storedUser, storedExpiresAt, storedRefresh] =
      await Promise.all([
        readStore(TOKEN_KEY),
        readStore(USER_KEY),
        readStore(EXPIRES_AT_KEY),
        readStore(REFRESH_KEY),
      ]);

    if (!storedUser || (!storedToken && !storedRefresh)) {
      return false;
    }

    const parsedExpiresAt = Number(storedExpiresAt);
    const accessValid =
      Boolean(storedToken) &&
      Number.isFinite(parsedExpiresAt) &&
      parsedExpiresAt > Date.now();

    const applyCached = (accessToken: string, expiresAtValue: number) => {
      const parsedUser = withPublicUserMedia(JSON.parse(storedUser) as AuthUser);

      setToken(accessToken);
      setUser(parsedUser);
      setExpiresAt(Number.isFinite(expiresAtValue) ? expiresAtValue : null);
      setHasPin(Boolean(parsedUser.has_pin));
      applyNativeSession(accessToken);

      void registerForPushNotifications(accessToken).catch(
        (error: unknown) => {
          if (isNetworkError(error)) {
            return;
          }

          console.error("Неуспешна регистрация на push notifications:", error);
        },
      );

      return true;
    };

    if (!accessValid) {
      try {
        const refreshed = await refreshFromStore();
        return Boolean(refreshed);
      } catch (error) {
        if (isNetworkError(error) && storedToken) {
          return applyCached(storedToken, parsedExpiresAt);
        }

        throw error;
      }
    }

    return applyCached(storedToken as string, parsedExpiresAt);
  }, [refreshFromStore]);

  useEffect(() => {
    bindAuthSessionHandlers({
      refreshAccessToken: refreshFromStore,
      onUnauthorized: () => {
        void (async () => {
          await clearLocalSession();
          await syncLocalLoginAvailability();
        })();
      },
    });

    return () => bindAuthSessionHandlers(null);
  }, [refreshFromStore, clearLocalSession, syncLocalLoginAvailability]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await syncLocalLoginAvailability();

        const [storedToken, storedUser, storedRefresh] = await Promise.all([
          readStore(TOKEN_KEY),
          readStore(USER_KEY),
          readStore(REFRESH_KEY),
        ]);

        const hasStoredSession = Boolean(
          storedUser && (storedToken || storedRefresh),
        );

        if (!hasStoredSession) {
          return;
        }

        const restored = await hydrateStoredSession();

        if (!restored) {
          await clearLocalSession();
        }
      } catch (error) {
        if (isNetworkError(error)) {
          return;
        }

        console.error("Неуспешно възстановяване на сесията:", error);

        await clearLocalSession();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clearLocalSession, hydrateStoredSession, syncLocalLoginAvailability]);

  useEffect(() => {
    if (typeof user?.phone_visible !== "boolean") {
      return;
    }

    void applyLocalPhoneVisible(user.phone_visible);
  }, [user?.phone_visible]);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const delay = Math.max(0, expiresAt - REFRESH_SKEW_MS - Date.now());
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const next = await refreshFromStore();

          if (!next) {
            await clearLocalSession();
          }
        } catch (error) {
          if (!isNetworkError(error)) {
            await clearLocalSession();
          }
        }
      })();
    }, delay);

    return () => clearTimeout(timeout);
  }, [expiresAt, refreshFromStore, clearLocalSession]);

  const persistAuthResponse = useCallback(
    async (response: AuthResponse) => {
      if (response.deviceSecret) {
        await setDeviceSecret(response.deviceSecret);
        setHasDeviceSecret(true);
      }

      await setLastLoginEmail(response.user.email);
      setLastLoginEmailState(response.user.email);
      setHasPin(Boolean(response.hasPin ?? response.user.has_pin));

      await saveSession(
        response.token,
        response.user,
        response.expiresIn,
        response.refreshToken,
      );

      try {
        await registerForPushNotifications(response.token);
      } catch (error) {
        console.error("Неуспешна регистрация на push notifications:", error);
      }
    },
    [saveSession],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await registerRequest(payload);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const completeTotpLogin = useCallback(
    async (pendingToken: string, code: string) => {
      const response = await completeTotpLoginRequest(pendingToken, code);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const completeDevicePending = useCallback(
    async (pendingToken: string) => {
      const response = await completeDevicePendingRequest(pendingToken);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const completeDeviceEmailCode = useCallback(
    async (pendingToken: string, code: string) => {
      const response = await verifyDeviceEmailCodeRequest(pendingToken, code);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const completeEmailLogin = useCallback(
    async (pendingToken: string, code: string) => {
      const response = await completeEmailLoginRequest(pendingToken, code);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string, rememberMe = false) => {
      const response = await googleLoginRequest(idToken, rememberMe);
      await persistAuthResponse(response);
    },
    [persistAuthResponse],
  );

  const requireSavedEmail = useCallback(async (): Promise<string> => {
    const email = lastLoginEmail ?? (await getLastLoginEmail());

    if (!email) {
      throw new Error("Първо влезте с имейл и парола от това устройство.");
    }

    return email;
  }, [lastLoginEmail]);

  const loginWithPin = useCallback(
    async (pin: string, rememberMe = false) => {
      const email = await requireSavedEmail();
      await persistAuthResponse(await pinLoginRequest(email, pin, rememberMe));
    },
    [persistAuthResponse, requireSavedEmail],
  );

  const loginWithFingerprint = useCallback(
    async (rememberMe = false) => {
      const confirmed = await authenticateFingerprint("Потвърдете с отпечатък");

      if (!confirmed) {
        throw new Error("Потвърждението с отпечатък беше отказано.");
      }

      const [email, secret] = await Promise.all([
        requireSavedEmail(),
        getDeviceSecret(),
      ]);

      if (!secret) {
        throw new Error("Това устройство още не е доверено. Влезте с парола.");
      }

      await persistAuthResponse(
        await deviceSecretLoginRequest(email, secret, rememberMe),
      );
    },
    [persistAuthResponse, requireSavedEmail],
  );

  const loginWithDeviceLock = useCallback(
    async (rememberMe = false) => {
      const confirmed = await authenticateDeviceUnlock(
        "Отключете телефона, за да влезете",
      );

      if (!confirmed) {
        throw new Error("Отключването на телефона беше отказано.");
      }

      const [email, secret] = await Promise.all([
        requireSavedEmail(),
        getDeviceSecret(),
      ]);

      if (!secret) {
        throw new Error("Това устройство още не е доверено. Влезте с парола.");
      }

      await persistAuthResponse(
        await deviceSecretLoginRequest(email, secret, rememberMe),
      );
    },
    [persistAuthResponse, requireSavedEmail],
  );

  const setFingerprintLoginEnabledFlag = useCallback(async (enabled: boolean) => {
    await setFingerprintLoginEnabled(enabled);
    setFingerprintEnabled(enabled);
  }, []);

  const setDeviceLockLoginEnabledFlag = useCallback(async (enabled: boolean) => {
    await setDeviceLockLoginEnabled(enabled);
    setDeviceLockEnabled(enabled);
  }, []);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) {
      return;
    }

    loggingOutRef.current = true;
    const currentToken = token;

    try {
      if (currentToken) {
        await unregisterPushNotifications(currentToken);
        await logoutRequest(currentToken);
      }
    } catch (error) {
      console.error("Неуспешно прекратяване на сесията на сървъра:", error);
    } finally {
      await clearLocalSession();
      await syncLocalLoginAvailability();
      loggingOutRef.current = false;
    }
  }, [token, clearLocalSession, syncLocalLoginAvailability]);

  const endLocalSession = useCallback(async () => {
    loggingOutRef.current = true;
    if (token) {
      await unregisterPushNotifications(token);
    }
    await clearLocalSession();
    await syncLocalLoginAvailability();
    loggingOutRef.current = false;
  }, [token, clearLocalSession, syncLocalLoginAvailability]);

  const clearLocalQuickLogin = useCallback(async () => {
    await clearDeviceSecret();
    setHasDeviceSecret(false);
  }, []);

  const updateUser = useCallback(async (updatedUser: AuthUser) => {
    const publicUser = withPublicUserMedia(updatedUser);
    await writeStore(USER_KEY, JSON.stringify(publicUser));
    setUser(publicUser);
    setHasPin(Boolean(publicUser.has_pin));
  }, []);

  const setPinLoginEnabledFlag = useCallback(
    async (enabled: boolean) => {
      if (!token || !user) {
        return;
      }

      const result = await setPinLoginEnabledRequest(token, enabled);
      await updateUser({
        ...user,
        has_pin: result.hasPin,
        pin_login_enabled: result.pinLoginEnabled,
      });
    },
    [token, updateUser, user],
  );

  const setEmailLoginEnabledFlag = useCallback(
    async (enabled: boolean) => {
      if (!token || !user) {
        return;
      }

      const result = await setEmailLoginEnabledRequest(token, enabled);
      await updateUser({
        ...user,
        email_login_enabled: result.emailLoginEnabled,
      });
    },
    [token, updateUser, user],
  );

  const canUseFingerprintLogin = Boolean(
    hasDeviceSecret && fingerprintAvailable && fingerprintLoginEnabled && lastLoginEmail,
  );
  const canUseDeviceLockLogin = Boolean(
    hasDeviceSecret && deviceUnlockAvailable && deviceLockLoginEnabled && lastLoginEmail,
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      expiresAt,
      isLoading,
      isAuthenticated: Boolean(token && user && expiresAt),
      lastLoginEmail,
      hasDeviceSecret,
      hasPin,
      pinLoginEnabled: Boolean(user?.pin_login_enabled),
      emailLoginEnabled: Boolean(user?.email_login_enabled),
      fingerprintAvailable,
      deviceUnlockAvailable,
      fingerprintLoginEnabled,
      deviceLockLoginEnabled,
      canUseFingerprintLogin,
      canUseDeviceLockLogin,
      login,
      loginWithGoogle,
      loginWithPin,
      loginWithFingerprint,
      loginWithDeviceLock,
      completeTotpLogin,
      completeDevicePending,
      completeDeviceEmailCode,
      completeEmailLogin,
      setFingerprintLoginEnabledFlag,
      setDeviceLockLoginEnabledFlag,
      setPinLoginEnabledFlag,
      setEmailLoginEnabledFlag,
      register,
      logout,
      endLocalSession,
      updateUser,
      clearLocalQuickLogin,
    }),
    [
      user,
      token,
      expiresAt,
      isLoading,
      lastLoginEmail,
      hasDeviceSecret,
      hasPin,
      fingerprintAvailable,
      deviceUnlockAvailable,
      fingerprintLoginEnabled,
      deviceLockLoginEnabled,
      canUseFingerprintLogin,
      canUseDeviceLockLogin,
      login,
      loginWithGoogle,
      loginWithPin,
      loginWithFingerprint,
      loginWithDeviceLock,
      completeTotpLogin,
      completeDevicePending,
      completeDeviceEmailCode,
      completeEmailLogin,
      setFingerprintLoginEnabledFlag,
      setDeviceLockLoginEnabledFlag,
      setPinLoginEnabledFlag,
      setEmailLoginEnabledFlag,
      register,
      logout,
      endLocalSession,
      updateUser,
      clearLocalQuickLogin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
