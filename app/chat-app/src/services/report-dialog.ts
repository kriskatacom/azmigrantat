import { Alert } from "react-native";
import { reportContent, type ReportReason, type ReportTargetType } from "@/services/moderation";

const reasons: { label: string; value: ReportReason }[] = [
  { label: "Спам или измама", value: "spam" },
  { label: "Тормоз или заплахи", value: "harassment" },
  { label: "Реч на омразата", value: "hate" },
  { label: "Сексуално или насилствено съдържание", value: "sexual" },
  { label: "Нарушение на поверителността", value: "privacy" },
  { label: "Друга причина", value: "other" },
];

export function showReportDialog(token: string, targetType: ReportTargetType, targetId: number): void {
  Alert.alert(
    targetType === "user" ? "Докладване на потребител" : "Докладване на видео",
    "Изберете причина. Сигналът ще бъде изпратен до екипа за модерация.",
    [
      ...reasons.map(({ label, value }) => ({
        text: label,
        onPress: () => {
          void reportContent(token, targetType, targetId, value)
            .then(() => Alert.alert("Сигналът е изпратен", "Благодарим. Екипът ще го прегледа."))
            .catch((error: unknown) => Alert.alert("Сигналът не е изпратен", error instanceof Error ? error.message : "Опитайте отново."));
        },
      })),
      { text: "Отказ", style: "cancel" },
    ],
  );
}
