import { installNetworkGuard } from "@/services/network-guard";
import AppSplash from "@/components/app-splash";
import OfflineScreen from "@/components/offline-screen";
import DevicePendingApprovals from "@/components/auth/device-pending-approvals";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { ThemeProvider, useAppTheme } from "@/contexts/ThemeContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { useAuth } from "@/hooks/useAuth";
import { createDirectConversation, markConversationAsRead } from "@/services/chat";
import { parseIncomingCallData, setupIncomingCallNotifications } from "@/services/incoming-call";
import "@/services/notificationBackgroundTask";
import { getActiveConversationId } from "@/services/notificationState";
import { loadUserSettings } from "@/services/user-settings";
import {
  MISSED_CALL_CALLBACK_ACTION,
  MISSED_CALL_CATEGORY,
  MISSED_CALL_OPEN_CHAT_ACTION,
} from "@/types/notifications";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { canUseFullScreenIntent } from "../../modules/incoming-call";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../../global.css";

installNetworkGuard();

void SplashScreen.preventAutoHideAsync();

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
    const isChatAlert =
      data?.type === "chat_message" || data?.type === "message_reaction";
    const appIsActive = AppState.currentState === "active";

    return {
      shouldShowBanner: !isCurrentConversation,
      shouldShowList: !isCurrentConversation,
      shouldPlaySound:
        !isCurrentConversation && !(isChatAlert && appIsActive),
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

export { useAppTheme } from "@/contexts/ThemeContext";

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
        data?.type === "incoming_call_ended" ||
        data?.type === "device_login_approval"
      ) {
        return;
      }

      if (data?.type === "missed_video_call" || data?.type === "text") {
        const responseKey = `${notification.request.identifier}:${actionIdentifier}`;

        if (lastHandledResponseRef.current === responseKey) {
          return;
        }

        lastHandledResponseRef.current = responseKey;

        if (actionIdentifier === MISSED_CALL_CALLBACK_ACTION) {
          const callerId = Number(data?.caller_id);
          if (!Number.isInteger(callerId) || callerId <= 0) {
            router.push("/notifications");
            return;
          }

          router.push({
            pathname: "/video-call/[userId]",
            params: {
              userId: String(callerId),
              name: typeof data?.caller_name === "string" ? data.caller_name : "",
              image:
                typeof data?.caller_avatar === "string" ? data.caller_avatar : "",
              autoStart: "1",
            },
          });
          return;
        }

        if (actionIdentifier === MISSED_CALL_OPEN_CHAT_ACTION) {
          const conversationId = Number(data?.conversation_id);
          const callerId = Number(data?.caller_id);
          const title =
            typeof data?.caller_name === "string" ? data.caller_name : "";
          const image =
            typeof data?.caller_avatar === "string" ? data.caller_avatar : "";

          if (Number.isInteger(conversationId) && conversationId > 0) {
            router.push({
              pathname: "/chat/[id]",
              params: {
                id: String(conversationId),
                userId: Number.isInteger(callerId) ? String(callerId) : "",
                title,
                image,
              },
            });
            return;
          }

          if (!token || !Number.isInteger(callerId) || callerId <= 0) {
            router.push("/notifications");
            return;
          }

          try {
            const conversation = await createDirectConversation(token, callerId);
            router.push({
              pathname: "/chat/[id]",
              params: {
                id: conversation.id.toString(),
                userId: conversation.other_user?.id?.toString() ?? String(callerId),
                title: conversation.other_user?.name ?? conversation.title ?? title,
                image:
                  conversation.other_user?.profile_image ??
                  conversation.image ??
                  image,
              },
            });
          } catch (error) {
            console.error("Грешка при отваряне на чат от известие:", error);
            router.push("/notifications");
          }
          return;
        }

        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          const notificationId = Number(data?.notification_id);
          if (Number.isInteger(notificationId) && notificationId > 0) {
            router.push({
              pathname: "/notifications/[id]",
              params: { id: String(notificationId) },
            });
            return;
          }

          router.push("/notifications");
        }

        return;
      }

      if (
        (data?.type !== "chat_message" && data?.type !== "message_reaction") ||
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

    void Notifications.setNotificationCategoryAsync(MISSED_CALL_CATEGORY, [
      {
        identifier: MISSED_CALL_CALLBACK_ACTION,
        buttonTitle: "Обади се",
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: MISSED_CALL_OPEN_CHAT_ACTION,
        buttonTitle: "Към чата",
        options: {
          opensAppToForeground: true,
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
    void (async () => {
      try {
        await loadUserSettings();
      } catch (error: unknown) {
        console.error("Настройките на потребителя не се заредиха:", error);
      }

      console.log("[IncomingCall] checking full screen permission...");

      try {
        await setupIncomingCallNotifications();
      } catch (error: unknown) {
        console.error(
          "Категориите за входящи обаждания не се регистрираха:",
          error
        );
      }

      try {
        const allowed = await canUseFullScreenIntent();
        console.log("[IncomingCall] canUseFullScreenIntent:", allowed);
      } catch (error) {
        console.error("[IncomingCall] canUseFullScreenIntent ERROR:", error);
      }
    })();
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <NotificationNavigationHandler />
      <DevicePendingApprovals />

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

function SplashOverlay({ children }: PropsWithChildren) {
  const { isLoading } = useAuth();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {children}
      <OfflineScreen />
      {isLoading ? (
        <AppSplash
          onReady={() => {
            void SplashScreen.hideAsync();
          }}
        />
      ) : null}
    </View>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <ThemedRoot>
        <NetworkProvider>
          <AuthProvider>
            <SplashOverlay>
              <SocketProvider>
                <VideoCallProvider>
                  <RootNavigator />
                </VideoCallProvider>
              </SocketProvider>
            </SplashOverlay>
          </AuthProvider>
        </NetworkProvider>
      </ThemedRoot>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

function ThemedRoot({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {children}
    </GestureHandlerRootView>
  );
}
