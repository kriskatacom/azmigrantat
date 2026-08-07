import { darkTheme, lightTheme, type AppTheme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { getActiveConversationId } from "@/services/notificationState";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import "../../global.css";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    const notificationConversationId =
      data?.conversation_id !== undefined ? Number(data.conversation_id) : null;

    const activeConversationId = getActiveConversationId();

    const isCurrentConversation =
      notificationConversationId !== null &&
      activeConversationId !== null &&
      notificationConversationId === activeConversationId;

    return {
      shouldShowBanner: !isCurrentConversation,
      shouldShowList: !isCurrentConversation,
      shouldPlaySound: !isCurrentConversation,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  theme: lightTheme,
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();

  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemTheme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    if (systemTheme === "light" || systemTheme === "dark") {
      setColorScheme(systemTheme);
    }
  }, [systemTheme]);

  const toggleTheme = () => {
    setColorScheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const contextValue = useMemo(
    () => ({
      colorScheme,
      theme,
      toggleTheme,
    }),
    [colorScheme, theme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

function NotificationNavigationHandler() {
  const router = useRouter();

  const lastHandledNotificationIdRef = useRef<string | null>(null);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const notification = response.notification;

      const notificationId = notification.request.identifier;

      if (lastHandledNotificationIdRef.current === notificationId) {
        return;
      }

      const data = notification.request.content.data;

      if (
        data?.type !== "chat_message" ||
        data?.conversation_id === undefined
      ) {
        return;
      }

      const conversationId = Number(data.conversation_id);

      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return;
      }

      lastHandledNotificationIdRef.current = notificationId;

      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
        },
      });
    },
    [router],
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }

        handleNotificationResponse(response);
      })
      .catch((error) => {
        console.error("Грешка при прочитане на последната нотификация:", error);
      });

    return () => {
      subscription.remove();
    };
  }, [handleNotificationResponse]);

  return null;
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationNavigationHandler />

          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
