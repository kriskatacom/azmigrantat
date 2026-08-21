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
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
  registerRequest,
} from "@/services/auth";

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

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  endLocalSession: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
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
  const loggingOutRef = useRef(false);

  const clearLocalSession = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    ]);

    setToken(null);
    setUser(null);
    setExpiresAt(null);
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
        SecureStore.setItemAsync(TOKEN_KEY, newToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser)),
        SecureStore.setItemAsync(EXPIRES_AT_KEY, newExpiresAt.toString()),
      ];

      if (refreshToken) {
        persist.push(SecureStore.setItemAsync(REFRESH_KEY, refreshToken));
      } else {
        persist.push(SecureStore.deleteItemAsync(REFRESH_KEY));
      }

      await Promise.all(persist);

      setToken(newToken);
      setUser(newUser);
      setExpiresAt(newExpiresAt);
      applyNativeSession(newToken);
      loggingOutRef.current = false;
    },
    [],
  );

  const refreshFromStore = useCallback(async (): Promise<string | null> => {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);

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
      return null;
    }
  }, [saveSession, clearLocalSession]);

  useEffect(() => {
    bindAuthSessionHandlers({
      refreshAccessToken: refreshFromStore,
      onUnauthorized: () => {
        void clearLocalSession();
      },
    });

    return () => bindAuthSessionHandlers(null);
  }, [refreshFromStore, clearLocalSession]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser, storedExpiresAt, storedRefresh] =
          await Promise.all([
            SecureStore.getItemAsync(TOKEN_KEY),
            SecureStore.getItemAsync(USER_KEY),
            SecureStore.getItemAsync(EXPIRES_AT_KEY),
            SecureStore.getItemAsync(REFRESH_KEY),
          ]);

        if (!storedUser || (!storedToken && !storedRefresh)) {
          await clearLocalSession();
          return;
        }

        const parsedExpiresAt = Number(storedExpiresAt);
        const accessValid =
          Boolean(storedToken) &&
          Number.isFinite(parsedExpiresAt) &&
          parsedExpiresAt > Date.now();

        if (!accessValid) {
          const refreshed = await refreshFromStore();

          if (!refreshed) {
            await clearLocalSession();
          } else {
            void registerForPushNotifications(refreshed).catch((error) => {
              console.error(
                "Неуспешна регистрация на push notifications:",
                error,
              );
            });
          }

          return;
        }

        const parsedUser = JSON.parse(storedUser) as AuthUser;

        setToken(storedToken);
        setUser(parsedUser);
        setExpiresAt(parsedExpiresAt);
        applyNativeSession(storedToken as string);

        void registerForPushNotifications(storedToken as string).catch(
          (error: unknown) => {
            console.error(
              "Неуспешна регистрация на push notifications:",
              error,
            );
          },
        );
      } catch (error) {
        console.error("Неуспешно възстановяване на сесията:", error);

        await clearLocalSession();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clearLocalSession, refreshFromStore]);

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

  const login = useCallback(
    async (payload: LoginPayload) => {
      await persistAuthResponse(await loginRequest(payload));
    },
    [persistAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await persistAuthResponse(await registerRequest(payload));
    },
    [persistAuthResponse],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      await persistAuthResponse(await googleLoginRequest(idToken));
    },
    [persistAuthResponse],
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
      loggingOutRef.current = false;
    }
  }, [token, clearLocalSession]);

  const endLocalSession = useCallback(async () => {
    loggingOutRef.current = true;
    await clearLocalSession();
    loggingOutRef.current = false;
  }, [clearLocalSession]);

  const updateUser = useCallback(async (updatedUser: AuthUser) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
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
      login,
      loginWithGoogle,
      register,
      logout,
      endLocalSession,
      updateUser,
    }),
    [
      user,
      token,
      expiresAt,
      isLoading,
      login,
      loginWithGoogle,
      register,
      logout,
      endLocalSession,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
