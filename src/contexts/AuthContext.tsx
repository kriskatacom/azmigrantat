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
  completeTotpLoginRequest,
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
  registerRequest,
} from "@/services/auth";
import {
  authenticateWithBiometrics,
  clearBiometricCredentials,
  getBiometricCredentials,
  getBiometricLabel,
  getBiometricTypes,
  isBiometricLoginEnabled,
  isBiometricSupported,
  saveBiometricCredentials,
  setBiometricLoginEnabled,
  type BiometricCredentials,
} from "@/services/biometric";

import { registerForPushNotifications } from "@/services/notifications";
import { configureIncomingCallNativeSession } from "@/services/incoming-call";
import { getRealtimeHttpUrl } from "@/services/realtime-http";
import { bindAuthSessionHandlers } from "@/services/session-http";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

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

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  biometricSupported: boolean;
  biometricLoginEnabled: boolean;
  canUseBiometricLogin: boolean;
  biometricLabel: string;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<void>;
  loginWithBiometrics: (rememberMe?: boolean) => Promise<void>;
  completeTotpLogin: (pendingToken: string, code: string) => Promise<void>;
  enableBiometricLogin: (credentials?: BiometricCredentials) => Promise<void>;
  disableBiometricLogin: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  endLocalSession: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  updateBiometricCredentials: (credentials: BiometricCredentials) => Promise<void>;
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
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [canUseBiometricLogin, setCanUseBiometricLogin] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("биометрия и PIN");
  const [needsBiometricUnlock, setNeedsBiometricUnlock] = useState(false);
  const loggingOutRef = useRef(false);

  const syncBiometricLoginAvailability = useCallback(async () => {
    const [supported, enabled, types, credentials] = await Promise.all([
      isBiometricSupported(),
      isBiometricLoginEnabled(),
      getBiometricTypes(),
      getBiometricCredentials(),
    ]);

    setBiometricSupported(supported);
    setBiometricEnabled(enabled);
    setBiometricLabel(getBiometricLabel(types));
    setCanUseBiometricLogin(Boolean(supported && enabled && credentials));
  }, []);

  const clearLocalSession = useCallback(async () => {
    await Promise.all([
      deleteStore(TOKEN_KEY),
      deleteStore(REFRESH_KEY),
      deleteStore(USER_KEY),
      deleteStore(EXPIRES_AT_KEY),
    ]);

    setToken(null);
    setUser(null);
    setExpiresAt(null);
    setNeedsBiometricUnlock(false);
  }, []);

  const saveSession = useCallback(
    async (
      newToken: string,
      newUser: AuthUser,
      expiresIn: number,
      refreshToken: string | null,
    ) => {
      const newExpiresAt = Date.now() + expiresIn * 1000;
      const persist = [
        writeStore(TOKEN_KEY, newToken),
        writeStore(USER_KEY, JSON.stringify(newUser)),
        writeStore(EXPIRES_AT_KEY, newExpiresAt.toString()),
      ];

      if (refreshToken) {
        persist.push(writeStore(REFRESH_KEY, refreshToken));
      } else {
        persist.push(deleteStore(REFRESH_KEY));
      }

      await Promise.all(persist);

      setToken(newToken);
      setUser(newUser);
      setExpiresAt(newExpiresAt);
      setNeedsBiometricUnlock(false);
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
      console.error("Неуспешно подновяване на сесията:", error);
      await clearLocalSession();
      await syncBiometricLoginAvailability();
      return null;
    }
  }, [saveSession, clearLocalSession, syncBiometricLoginAvailability]);

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

    if (!accessValid) {
      const refreshed = await refreshFromStore();
      return Boolean(refreshed);
    }

    const parsedUser = JSON.parse(storedUser) as AuthUser;

    setToken(storedToken);
    setUser(parsedUser);
    setExpiresAt(parsedExpiresAt);
    setNeedsBiometricUnlock(false);
    applyNativeSession(storedToken as string);

    void registerForPushNotifications(storedToken as string).catch(
      (error: unknown) => {
        console.error("Неуспешна регистрация на push notifications:", error);
      },
    );

    return true;
  }, [refreshFromStore]);

  useEffect(() => {
    bindAuthSessionHandlers({
      refreshAccessToken: refreshFromStore,
      onUnauthorized: () => {
        void (async () => {
          await clearLocalSession();
          await syncBiometricLoginAvailability();
        })();
      },
    });

    return () => bindAuthSessionHandlers(null);
  }, [refreshFromStore, clearLocalSession, syncBiometricLoginAvailability]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser, storedRefresh, supported, enabled, credentials] =
          await Promise.all([
            readStore(TOKEN_KEY),
            readStore(USER_KEY),
            readStore(REFRESH_KEY),
            isBiometricSupported(),
            isBiometricLoginEnabled(),
            getBiometricCredentials(),
          ]);

        setBiometricSupported(supported);
        setBiometricEnabled(enabled);
        setBiometricLabel(getBiometricLabel(await getBiometricTypes()));
        setCanUseBiometricLogin(Boolean(supported && enabled && credentials));

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
        console.error("Неуспешно възстановяване на сесията:", error);

        await clearLocalSession();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clearLocalSession, hydrateStoredSession]);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const delay = Math.max(0, expiresAt - REFRESH_SKEW_MS - Date.now());
    const timeout = setTimeout(() => {
      void (async () => {
        const next = await refreshFromStore();

        if (!next) {
          await clearLocalSession();
        }
      })();
    }, delay);

    return () => clearTimeout(timeout);
  }, [expiresAt, refreshFromStore, clearLocalSession]);

  const persistAuthResponse = useCallback(
    async (response: {
      token: string;
      refreshToken: string | null;
      expiresIn: number;
      user: AuthUser;
    }) => {
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

  const enableBiometricLogin = useCallback(
    async (credentials?: BiometricCredentials) => {
      if (!(await isBiometricSupported())) {
        throw new Error(
          "За бърз вход са нужни и биометрия, и PIN, фигура или парола на телефона.",
        );
      }

      const confirmed = await authenticateWithBiometrics(
        "Потвърдете, за да включите бързия вход",
      );

      if (!confirmed) {
        throw new Error("Биометричното потвърждение беше отказано.");
      }

      await setBiometricLoginEnabled(true);

      if (credentials) {
        await saveBiometricCredentials(credentials);
      }

      setBiometricEnabled(true);
      setBiometricSupported(true);
      setCanUseBiometricLogin(true);
    },
    [],
  );

  const disableBiometricLogin = useCallback(async () => {
    await setBiometricLoginEnabled(false);
    setBiometricEnabled(false);
    setCanUseBiometricLogin(false);
    setNeedsBiometricUnlock(false);
  }, []);

  const offerBiometricLogin = useCallback(
    async (userEmail: string, credentials?: BiometricCredentials) => {
      if (!(await isBiometricLoginEnabled())) {
        return;
      }

      if (credentials) {
        await saveBiometricCredentials(credentials);
      } else {
        const stored = await getBiometricCredentials();

        if (stored && stored.email !== userEmail.trim().toLowerCase()) {
          await clearBiometricCredentials();
        }
      }

      setBiometricEnabled(true);
      setCanUseBiometricLogin(true);
    },
    [],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      await persistAuthResponse(response);
      await offerBiometricLogin(response.user.email, {
        email: payload.email,
        password: payload.password,
      });
    },
    [persistAuthResponse, offerBiometricLogin],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await registerRequest(payload);
      await persistAuthResponse(response);
      await offerBiometricLogin(response.user.email, {
        email: payload.email,
        password: payload.password,
      });
    },
    [persistAuthResponse, offerBiometricLogin],
  );

  const completeTotpLogin = useCallback(
    async (pendingToken: string, code: string) => {
      const response = await completeTotpLoginRequest(pendingToken, code);
      await persistAuthResponse(response);
      await offerBiometricLogin(response.user.email);
    },
    [persistAuthResponse, offerBiometricLogin],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string, rememberMe = false) => {
      const response = await googleLoginRequest(idToken, rememberMe);
      await persistAuthResponse(response);
      await offerBiometricLogin(response.user.email);
    },
    [persistAuthResponse, offerBiometricLogin],
  );

  const loginWithBiometrics = useCallback(async (rememberMe = false) => {
    const confirmed = await authenticateWithBiometrics("Потвърдете, за да влезете");

    if (!confirmed) {
      throw new Error("Биометричното потвърждение беше отказано.");
    }

    if (needsBiometricUnlock) {
      const restored = await hydrateStoredSession();

      if (restored) {
        return;
      }
    }

    const credentials = await getBiometricCredentials();

    if (!credentials) {
      throw new Error(
        "Няма запазен бърз вход. Влезте с имейл и парола.",
      );
    }

    await persistAuthResponse(
      await loginRequest({
        ...credentials,
        rememberMe,
      }),
    );
  }, [hydrateStoredSession, needsBiometricUnlock, persistAuthResponse]);

  const updateBiometricCredentials = useCallback(
    async (credentials: BiometricCredentials) => {
      if (!(await isBiometricLoginEnabled())) {
        return;
      }

      await saveBiometricCredentials(credentials);
    },
    [],
  );

  const logout = useCallback(async () => {
    if (loggingOutRef.current) {
      return;
    }

    loggingOutRef.current = true;
    const currentToken = token;

    try {
      if (currentToken) {
        await logoutRequest(currentToken);
      }
    } catch (error) {
      console.error("Неуспешно прекратяване на сесията на сървъра:", error);
    } finally {
      await clearLocalSession();
      await syncBiometricLoginAvailability();
      loggingOutRef.current = false;
    }
  }, [token, clearLocalSession, syncBiometricLoginAvailability]);

  const endLocalSession = useCallback(async () => {
    loggingOutRef.current = true;
    await clearLocalSession();
    await syncBiometricLoginAvailability();
    loggingOutRef.current = false;
  }, [clearLocalSession, syncBiometricLoginAvailability]);

  const updateUser = useCallback(async (updatedUser: AuthUser) => {
    await writeStore(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      expiresAt,
      isLoading,
      isAuthenticated: Boolean(
        token && user && expiresAt && expiresAt > Date.now(),
      ),
      biometricSupported,
      biometricLoginEnabled: biometricEnabled,
      canUseBiometricLogin,
      biometricLabel,
      login,
      loginWithGoogle,
      loginWithBiometrics,
      completeTotpLogin,
      enableBiometricLogin,
      disableBiometricLogin,
      register,
      logout,
      endLocalSession,
      updateUser,
      updateBiometricCredentials,
    }),
    [
      user,
      token,
      expiresAt,
      isLoading,
      biometricSupported,
      biometricEnabled,
      canUseBiometricLogin,
      biometricLabel,
      login,
      loginWithGoogle,
      loginWithBiometrics,
      completeTotpLogin,
      enableBiometricLogin,
      disableBiometricLogin,
      register,
      logout,
      endLocalSession,
      updateUser,
      updateBiometricCredentials,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
