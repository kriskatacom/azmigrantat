import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import CardScanModal from "@/components/profile/card-scan-modal";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/hooks/useAuth";
import {
  brandLabel,
  formatCardNumber,
  formatExpiryInput,
  luhnValid,
  parseExpiry,
} from "@/services/card-format";
import {
  deletePaymentMethod,
  getPaymentMethods,
  savePaymentMethod,
  setAutoRenewal,
  setDefaultPaymentMethod,
} from "@/services/payments";
import type { SavedPaymentMethod } from "@/types/payments";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PaymentsScreen() {
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoRenewal, setAutoRenewalEnabled] = useState(false);
  const [isUpdatingRenewal, setIsUpdatingRenewal] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedPaymentMethod | null>(
    null,
  );

  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holderName, setHolderName] = useState("");

  const loadCards = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setCards([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (mode === "refresh") setIsRefreshing(true);
        else setIsLoading(true);

        const response = await getPaymentMethods(token);
        setCards(response.cards);
        setAutoRenewalEnabled(response.autoRenewal);
      } catch (error) {
        Alert.alert(
          "Грешка",
          error instanceof Error
            ? error.message
            : "Картите не можаха да бъдат заредени.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCards("refresh");
    }, [loadCards]),
  );

  const digits = number.replace(/\D+/g, "");
  const parsedExpiry = parseExpiry(expiry);
  const canSave =
    luhnValid(digits) &&
    parsedExpiry !== null &&
    /^\d{3,4}$/.test(cvc) &&
    !isSaving;

  const handleSave = async () => {
    if (!token || !parsedExpiry || !canSave) {
      return;
    }

    setIsSaving(true);
    try {
      await savePaymentMethod(token, {
        number: digits,
        exp_month: parsedExpiry.month,
        exp_year: parsedExpiry.year,
        cvc,
        holder_name: holderName.trim() || undefined,
      });

      const response = await getPaymentMethods(token);
      setCards(response.cards);
      setAutoRenewalEnabled(response.autoRenewal);
      setNumber("");
      setExpiry("");
      setCvc("");
      setHolderName("");
      Alert.alert("Готово", "Картата беше запазена за бъдещи плащания.");
    } catch (error) {
      Alert.alert(
        "Неуспешно",
        error instanceof Error ? error.message : "Картата не можа да бъде запазена.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoRenewalChange = async (enabled: boolean) => {
    if (!token || isUpdatingRenewal) {
      return;
    }

    const previous = autoRenewal;
    setAutoRenewalEnabled(enabled);
    setIsUpdatingRenewal(true);

    try {
      setAutoRenewalEnabled(await setAutoRenewal(token, enabled));
    } catch (error) {
      setAutoRenewalEnabled(previous);
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Настройката не можа да бъде запазена.",
      );
    } finally {
      setIsUpdatingRenewal(false);
    }
  };

  const handleSetDefault = async (card: SavedPaymentMethod) => {
    if (!token || card.is_default) {
      return;
    }

    try {
      const updated = await setDefaultPaymentMethod(token, card.id);
      setCards((current) =>
        current.map((item) => ({
          ...item,
          is_default: item.id === updated.id,
        })),
      );
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Картата не можа да бъде избрана.",
      );
    }
  };

  const handleDelete = async () => {
    if (!token || !pendingDelete) {
      return;
    }

    const cardId = pendingDelete.id;
    setPendingDelete(null);

    try {
      await deletePaymentMethod(token, cardId);
      setCards((current) => current.filter((item) => item.id !== cardId));
    } catch (error) {
      Alert.alert(
        "Грешка",
        error instanceof Error
          ? error.message
          : "Картата не можа да бъде премахната.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <Header title="Плащания" hideSearchButton hideAuthButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadCards("refresh")}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Подновяване
        </Text>
        <View
          style={[
            styles.settingRow,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Автоматично подновяване
            </Text>
            <Text
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
            >
              Ако е включено, плащането ще се подновява автоматично с основната
              карта.
            </Text>
          </View>
          <Switch
            value={autoRenewal}
            onValueChange={(value) => {
              void handleAutoRenewalChange(value);
            }}
            disabled={isUpdatingRenewal}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.buttonText}
            accessibilityLabel="Автоматично подновяване"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Запазени карти
        </Text>

        {isLoading && cards.length === 0 ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : cards.length === 0 ? (
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            Все още нямате запазена карта.
          </Text>
        ) : (
          cards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <FontAwesome
                  name="credit-card"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {brandLabel(card.brand)} •••• {card.last4}
                </Text>
                <Text
                  style={[
                    styles.cardMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {String(card.exp_month).padStart(2, "0")}/
                  {String(card.exp_year).slice(-2)}
                  {card.holder_name ? ` · ${card.holder_name}` : ""}
                  {card.is_default ? " · по подразбиране" : ""}
                </Text>
              </View>
              {!card.is_default ? (
                <TouchableOpacity
                  onPress={() => void handleSetDefault(card)}
                  accessibilityRole="button"
                  accessibilityLabel="Избери по подразбиране"
                >
                  <Text
                    style={[styles.action, { color: theme.colors.primary }]}
                  >
                    Основна
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => setPendingDelete(card)}
                accessibilityRole="button"
                accessibilityLabel="Премахни картата"
              >
                <Text style={[styles.action, { color: theme.colors.danger }]}>
                  Премахни
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Нова карта
        </Text>
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          Сканирайте картата или въведете данните. Запазваме я за следващи
          плащания. CVC се използва само за потвърждение и не се съхранява.
        </Text>

        <AppButton
          title="Сканирай карта"
          onPress={() => setScannerOpen(true)}
        />

        <AppInput
          label="Номер на карта"
          value={number}
          onChangeText={(value) => setNumber(formatCardNumber(value))}
          keyboardType="number-pad"
          autoComplete="cc-number"
          placeholder="ACCT-000003"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <AppInput
              label="Валидност"
              value={expiry}
              onChangeText={(value) => setExpiry(formatExpiryInput(value))}
              keyboardType="number-pad"
              autoComplete="cc-exp"
              placeholder="MM/ГГ"
            />
          </View>
          <View style={styles.half}>
            <AppInput
              label="CVC"
              value={cvc}
              onChangeText={(value) =>
                setCvc(value.replace(/\D+/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              autoComplete="cc-csc"
              placeholder="123"
              secureTextEntry
            />
          </View>
        </View>
        <AppInput
          label="Име върху картата"
          value={holderName}
          onChangeText={setHolderName}
          autoCapitalize="characters"
          autoComplete="cc-family-name"
          placeholder="IVAN IVANOV"
        />
        <AppButton
          title="Запази картата"
          loading={isSaving}
          disabled={!canSave}
          onPress={() => void handleSave()}
        />
      </ScrollView>

      <CardScanModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(result) => {
          setNumber(result.number);
          if (result.expiry) {
            setExpiry(result.expiry);
          }
          if (result.holderName) {
            setHolderName(result.holderName);
          }
        }}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Премахване на карта"
        message={`Да премахнете ли картата •••• ${pendingDelete?.last4 ?? ""}?`}
        confirmText="Премахни"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 44, gap: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  settingRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: { flex: 1, gap: 4 },
  settingLabel: { fontSize: 16, fontWeight: "700" },
  divider: { height: 1, marginVertical: 8 },
  card: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 13, lineHeight: 18 },
  action: { fontSize: 13, fontWeight: "700" },
});
