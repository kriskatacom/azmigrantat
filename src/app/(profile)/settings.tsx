import { useAppTheme } from "@/app/_layout";
import Header from "@/components/Header";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  setAppearancePreference,
  setChatFontSize,
  setPhoneVisible,
  setShowFullCallDetails,
  setVibrationEnabled,
  type AppearancePreference,
  type ChatFontSize,
} from "@/services/user-settings";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

const FONT_OPTIONS: { value: ChatFontSize; label: string }[] = [
  { value: "small", label: "Малък" },
  { value: "medium", label: "Среден" },
  { value: "large", label: "Голям" },
];

const THEME_OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "Система" },
  { value: "light", label: "Светла" },
  { value: "dark", label: "Тъмна" },
];

export default function UserSettingsScreen() {
  const { theme } = useAppTheme();
  const userSettings = useUserSettings();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header title="Настройки" hideSearchButton hideAuthButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Известия
        </Text>
        <View
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Вибрация
            </Text>
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
            >
              Вибрация при ново съобщение или известие.
            </Text>
          </View>
          <Switch
            value={userSettings.vibrationEnabled}
            onValueChange={(value) => {
              void setVibrationEnabled(value);
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.buttonText}
            accessibilityLabel="Вибрация при съобщения и известия"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Изглед
        </Text>
        <View
          style={[
            styles.block,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Тема
          </Text>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            Светъл, тъмен или според системата.
          </Text>
          <View style={styles.options}>
            {THEME_OPTIONS.map((option) => {
              const selected = userSettings.appearance === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    void setAppearancePreference(option.value);
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.primary
                        : theme.colors.background,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Тема ${option.label}`}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected
                          ? theme.colors.buttonText
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.block,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Размер на шрифта в чата
          </Text>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            Променя текста в съобщенията и полето за писане.
          </Text>
          <View style={styles.options}>
            {FONT_OPTIONS.map((option) => {
              const selected = userSettings.chatFontSize === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    void setChatFontSize(option.value);
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.primary
                        : theme.colors.background,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Шрифт ${option.label}`}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected
                          ? theme.colors.buttonText
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Пълни детайли за обаждания
            </Text>
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
            >
              Показва участници, продължителност и други данни в чата. Изключи,
              за да виждаш само заглавието.
            </Text>
          </View>
          <Switch
            value={userSettings.showFullCallDetails}
            onValueChange={(value) => {
              void setShowFullCallDetails(value);
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.buttonText}
            accessibilityLabel="Пълни детайли за обаждания в чата"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Поверителност
        </Text>
        <View
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Телефонът да е видим
            </Text>
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
            >
              Настройката се запазва. Засега номерът не се показва никъде в
              приложението.
            </Text>
          </View>
          <Switch
            value={userSettings.phoneVisible}
            onValueChange={(value) => {
              void setPhoneVisible(value);
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.buttonText}
            accessibilityLabel="Телефонът да е видим"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 6 },
  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  block: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  rowText: { flex: 1, gap: 4 },
  label: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 13, lineHeight: 18 },
  options: { flexDirection: "row", gap: 8, marginTop: 4 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  optionLabel: { fontSize: 13, fontWeight: "700" },
});
