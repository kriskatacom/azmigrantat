import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import {
  approveDevicePendingRequest,
  listDevicePendingRequest,
} from "@/services/auth";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "@/components/ui/AppButton";

type PendingDevice = {
  id: number;
  device_name: string | null;
  platform: string | null;
};

export default function DevicePendingApprovals() {
  const { theme } = useAppTheme();
  const { token, isAuthenticated } = useAuth();
  const [pending, setPending] = useState<PendingDevice[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setPending([]);
      return;
    }

    try {
      setPending(await listDevicePendingRequest(token));
    } catch {
      // Ignore background polling errors.
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 8000);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  const current = pending[0];

  if (!current) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Ново устройство
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Някой иска да влезе от{" "}
            {current.device_name || "непознато устройство"}
            {current.platform ? ` (${current.platform})` : ""}. Потвърдете само
            ако това сте вие.
          </Text>
          <AppButton
            title="Потвърди устройството"
            loading={busyId === current.id}
            onPress={() => {
              void (async () => {
                if (!token) {
                  return;
                }

                try {
                  setBusyId(current.id);
                  await approveDevicePendingRequest(token, current.id);
                  await refresh();
                } catch (error) {
                  Alert.alert(
                    "Неуспешно",
                    error instanceof Error
                      ? error.message
                      : "Устройството не беше потвърдено.",
                  );
                } finally {
                  setBusyId(null);
                }
              })();
            }}
          />
          <AppButton
            title="Не сега"
            onPress={() => {
              setPending((items) => items.filter((item) => item.id !== current.id));
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
});
