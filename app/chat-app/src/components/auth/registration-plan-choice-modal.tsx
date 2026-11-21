import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type RegistrationPlan = "free" | "paid";

interface RegistrationPlanChoiceModalProps {
  visible: boolean;
  selectedPlan: RegistrationPlan;
  submitting: boolean;
  onSelect: (plan: RegistrationPlan) => void;
  onContinue: () => void;
}

export default function RegistrationPlanChoiceModal({
  visible,
  selectedPlan,
  submitting,
  onSelect,
  onContinue,
}: RegistrationPlanChoiceModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => undefined}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Изберете абонамент</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Безплатният план е избран по подразбиране.</Text>

          <Pressable
            style={[
              styles.option,
              { borderColor: selectedPlan === "free" ? theme.colors.primary : theme.colors.border },
              selectedPlan === "free" && styles.freeSelected,
            ]}
            disabled={submitting}
            onPress={() => onSelect("free")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === "free" }}
          >
            <Ionicons name="person-outline" size={27} color={theme.colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.name, { color: theme.colors.text }]}>Безплатен план</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Продължавате без плащане.</Text>
            </View>
            <Ionicons name={selectedPlan === "free" ? "radio-button-on" : "radio-button-off"} size={24} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            style={[
              styles.option,
              styles.paid,
              { borderColor: selectedPlan === "paid" ? "#D7A400" : theme.colors.border },
              selectedPlan === "paid" && styles.paidSelected,
            ]}
            disabled={submitting}
            onPress={() => onSelect("paid")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === "paid" }}
          >
            <Ionicons name="diamond-outline" size={27} color="#D7A400" />
            <View style={styles.copy}>
              <Text style={[styles.name, { color: theme.colors.text }]}>Платен план</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>30-дневен достъп. Цената се показва преди плащането.</Text>
            </View>
            <Ionicons name={selectedPlan === "paid" ? "radio-button-on" : "radio-button-off"} size={24} color="#D7A400" />
          </Pressable>

          <AppButton
            title={selectedPlan === "paid" ? "Продължи към плащане" : "Продължи с безплатен план"}
            loading={submitting}
            onPress={onContinue}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.72)" },
  modal: { width: "100%", maxWidth: 480, alignSelf: "center", padding: 22, borderRadius: 24, gap: 14 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: "center", marginBottom: 4 },
  option: { minHeight: 96, padding: 16, borderWidth: 2, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 13 },
  freeSelected: { backgroundColor: "rgba(59,130,246,0.10)" },
  paid: { backgroundColor: "rgba(215,164,0,0.05)" },
  paidSelected: { backgroundColor: "rgba(215,164,0,0.14)" },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 18, lineHeight: 23, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20 },
});
