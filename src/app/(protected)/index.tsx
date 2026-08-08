import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProtectedHomeScreen() {
  const { theme } = useAppTheme();
  const { user, logout, expiresAt } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Header title="Защитена начална страница" hideAuthButton />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY,
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
            },
          ]}
        >
          Здравей, {user?.firstName ?? "потребител"}!
        </Text>

        <Text
          style={[
            styles.text,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          Това е временна защитена начална страница. Премести тук текущия
          HomeScreen.
        </Text>

        <Text
          style={[
            styles.session,
            {
              color: theme.colors.text,
            },
          ]}
        >
          Сесията е активна до:
        </Text>

        <Text
          style={[
            styles.sessionDate,
            {
              color: theme.colors.primary,
            },
          ]}
        >
          {expiresAt ? new Date(expiresAt).toLocaleString("bg-BG") : "-"}
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.danger,
            },
          ]}
          onPress={() => void logout()}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: theme.colors.buttonText,
              },
            ]}
          >
            Изход
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
  },

  text: {
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },

  session: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },

  sessionDate: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 28,
  },

  button: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
