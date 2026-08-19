import { darkTheme, lightTheme, type AppTheme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { useAuth } from "@/hooks/useAuth";
import { markConversationAsRead } from "@/services/chat";
import { parseIncomingCallData, setupIncomingCallNotifications } from "@/services/incoming-call";
import "@/services/notificationBackgroundTask";
import { getActiveConversationId } from "@/services/notificationState";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { AppState, useColorScheme } from "react-native";
import "../../global.css";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    const incomingCall = parseIncomingCallData(data);

    if (incomingCall?.type === "incoming_call_ended") {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    if (incomingCall?.type === "incoming_call") {
      const showSystemCallAlert = AppState.currentState !== "active";

      return {
        shouldShowBanner: showSystemCallAlert,
        shouldShowList: showSystemCallAlert,
        shouldPlaySound: showSystemCallAlert,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

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
  const { token, isAuthenticated } = useAuth();

  const lastHandledResponseRef = useRef<string | null>(null);

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const notification = response.notification;
      const data = notification.request.content.data;
      const actionIdentifier = response.actionIdentifier;

      console.log("Notification action:", actionIdentifier);

      if (
        data?.type === "incoming_call" ||
        data?.type === "incoming_call_ended"
      ) {
        return;
      }

      if (
        data?.type !== "chat_message" ||
        data?.conversation_id === undefined
      ) {
        return;
      }

      const conversationId = Number(data.conversation_id);

      const messageId =
        data.message_id !== undefined ? Number(data.message_id) : null;

      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return;
      }

      const responseKey = `${notification.request.identifier}:${actionIdentifier}`;

      if (lastHandledResponseRef.current === responseKey) {
        return;
      }

      lastHandledResponseRef.current = responseKey;

      if (
        actionIdentifier === "mark_read" ||
        actionIdentifier === "mark-read"
      ) {
        console.log("Избрано mark_read");

        if (!token) {
          console.log("Няма access token за mark_read.");
          return;
        }

        try {
          await markConversationAsRead(
            token,
            conversationId,
            messageId ?? undefined,
          );

          await Notifications.dismissNotificationAsync(
            notification.request.identifier,
          );

          console.log("Маркирано като прочетено.");
        } catch (error) {
          console.error("Грешка при маркиране като прочетено:", error);
        }

        return;
      }

      if (actionIdentifier === "reply") {
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: String(conversationId),
          },
        });

        return;
      }

      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: String(conversationId),
          },
        });

        return;
      }

      console.log("Непознат notification action:", actionIdentifier);
    },
    [router, token],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void Notifications.setNotificationCategoryAsync("chat_message", [
      {
        identifier: "reply",
        buttonTitle: "Отговор",
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: "mark_read",
        buttonTitle: "Маркирай като прочетено",
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    void Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response) {
          return;
        }

        await handleNotificationResponse(response);

        await Notifications.clearLastNotificationResponseAsync();
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

function RootNavigator() {
  const { theme, colorScheme } = useAppTheme();

  useEffect(() => {
    void setupIncomingCallNotifications().catch((error: unknown) => {
      console.error("Категориите за входящи обаждания не се регистрираха:", error);
    });
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <NotificationNavigationHandler />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <VideoCallProvider>
            <RootNavigator />
          </VideoCallProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
