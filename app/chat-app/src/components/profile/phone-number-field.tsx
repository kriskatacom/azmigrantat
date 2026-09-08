import { useAppTheme } from "@/app/_layout";
import {
  composePhone,
  EUROPEAN_DIAL_CODES,
  flagEmoji,
  splitStoredPhone,
  type EuropeanDialCode,
} from "@/constants/european-dial-codes";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (fullNumber: string) => void;
  label?: string;
}

export default function PhoneNumberField({
  value,
  onChange,
  label = "Телефонен номер",
}: PhoneNumberFieldProps) {
  const { theme } = useAppTheme();
  const parsed = splitStoredPhone(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected =
    EUROPEAN_DIAL_CODES.find((item) => item.dial === parsed.dial) ??
    EUROPEAN_DIAL_CODES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return EUROPEAN_DIAL_CODES;
    return EUROPEAN_DIAL_CODES.filter(
      (item) =>
        item.name.toLocaleLowerCase().includes(q) ||
        item.dial.includes(q) ||
        item.iso.toLocaleLowerCase().includes(q),
    );
  }, [query]);

  const apply = (dial: string, national: string) => {
    onChange(composePhone(dial, national));
  };

  const selectCountry = (item: EuropeanDialCode) => {
    apply(item.dial, parsed.national);
    setPickerOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Код на държава"
          onPress={() => setPickerOpen(true)}
          style={[
            styles.dialButton,
            {
              backgroundColor: theme.colors.input,
              borderColor: theme.colors.inputBorder,
            },
          ]}
        >
          <Text style={styles.flag}>{flagEmoji(selected.iso)}</Text>
          <Text style={[styles.dialText, { color: theme.colors.text }]}>
            +{selected.dial}
          </Text>
        </Pressable>
        <TextInput
          value={parsed.national}
          onChangeText={(national) => apply(selected.dial, national)}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="888123456"
          placeholderTextColor={theme.colors.placeholder}
          style={[
            styles.numberInput,
            {
              backgroundColor: theme.colors.input,
              borderColor: theme.colors.inputBorder,
              color: theme.colors.text,
            },
          ]}
        />
      </View>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        Избери държава и въведи само номера, без водеща нула.
      </Text>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Код на държава
            </Text>
            <Pressable onPress={() => setPickerOpen(false)}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                Затвори
              </Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Търси държава или код"
            placeholderTextColor={theme.colors.placeholder}
            autoCapitalize="none"
            style={[
              styles.search,
              {
                backgroundColor: theme.colors.input,
                borderColor: theme.colors.inputBorder,
                color: theme.colors.text,
              },
            ]}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.dial === selected.dial;
              return (
                <Pressable
                  onPress={() => selectCountry(item)}
                  style={[
                    styles.option,
                    {
                      borderBottomColor: theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.input
                        : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.flag}>{flagEmoji(item.iso)}</Text>
                  <Text style={[styles.optionName, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDial,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    +{item.dial}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  dialButton: {
    minHeight: 50,
    minWidth: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dialText: { fontSize: 16, fontWeight: "700" },
  flag: { fontSize: 18 },
  numberInput: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { fontSize: 12, lineHeight: 16 },
  modal: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    fontSize: 16,
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  optionName: { flex: 1, fontSize: 16 },
  optionDial: { fontSize: 15, fontWeight: "700" },
});
