import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loginRequest, logoutRequest, registerRequest } from "@/services/auth";

import { registerForPushNotifications } from "@/services/notifications";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const EXPIRES_AT_KEY = "auth_expires_at";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearLocalSession = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    ]);

    setToken(null);
    setUser(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser, storedExpiresAt] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(EXPIRES_AT_KEY),
        ]);

        if (!storedToken || !storedUser || !storedExpiresAt) {
          await clearLocalSession();
          return;
        }

        const parsedExpiresAt = Number(storedExpiresAt);

        if (
          !Number.isFinite(parsedExpiresAt) ||
          parsedExpiresAt <= Date.now()
        ) {
          await clearLocalSession();
          return;
        }

        const parsedUser = JSON.parse(storedUser) as AuthUser;

        setToken(storedToken);
        setUser(parsedUser);
        setExpiresAt(parsedExpiresAt);
      } catch (error) {
        console.error("Неуспешно възстановяване на сесията:", error);

        await clearLocalSession();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clearLocalSession]);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const remainingTime = expiresAt - Date.now();

    if (remainingTime <= 0) {
      void clearLocalSession();
      return;
    }

    const timeout = setTimeout(() => {
      void clearLocalSession();
    }, remainingTime);

    return () => clearTimeout(timeout);
  }, [expiresAt, clearLocalSession]);

  const saveSession = useCallback(
    async (newToken: string, newUser: AuthUser, expiresIn: number) => {
      const newExpiresAt = Date.now() + expiresIn * 1000;

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, newToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser)),
        SecureStore.setItemAsync(EXPIRES_AT_KEY, newExpiresAt.toString()),
      ]);

      setToken(newToken);
      setUser(newUser);
      setExpiresAt(newExpiresAt);
    },
    [],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);

      await saveSession(response.token, response.user, response.expiresIn);

      try {
        await registerForPushNotifications(response.token);
      } catch (error) {
        console.error("Неуспешна регистрация на push notifications:", error);
      }
    },
    [saveSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await registerRequest(payload);

      await saveSession(response.token, response.user, response.expiresIn);
    },
    [saveSession],
  );

  const logout = useCallback(async () => {
    const currentToken = token;

    try {
      if (currentToken) {
        await logoutRequest(currentToken);
      }
    } catch (error) {
      console.error("Неуспешно прекратяване на сесията на сървъра:", error);
    } finally {
      await clearLocalSession();
    }
  }, [token, clearLocalSession]);

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
      register,
      logout,
    }),
    [user, token, expiresAt, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
