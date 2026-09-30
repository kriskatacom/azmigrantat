import { useAppTheme } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  description: string | null;
  visible?: boolean;
  height?: number | `${number}%`;
  allowExpand?: boolean;
  fitContent?: boolean;
  bottomOffset?: number;
  topOffset?: number;
  maxHeight?: number;
};

export default function VideoCaption({
  title,
  description,
  visible = true,
  bottomOffset = 0,
}: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const hasContent = Boolean(title.trim() || description?.trim());

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible && hasContent ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (!visible) setModalVisible(false);
  }, [hasContent, opacity, visible]);

  if (!hasContent) return null;

  return (
    <>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[styles.triggerContainer, { bottom: Math.max(insets.bottom + 8, 24, bottomOffset), opacity }]}
      >
        <Pressable
          style={styles.moreButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Виж заглавието и цялото описание на видеото"
        >
          <Ionicons name="information-circle-outline" size={28} color="#ffffff" />
          <Text style={styles.moreButtonText}>Виж повече</Text>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Затвори описанието"
          />
          <View style={[styles.modalPanel, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.inputBorder }]}>
              <Text style={[styles.modalHeading, { color: theme.colors.text }]}>Детайли за видеото</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Затвори описанието"
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={styles.titleSection}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.colors.inputBorder }]} />
              <View style={styles.descriptionSection}>
                {description ? (
                  <Text style={[styles.description, { color: theme.colors.text }]}>{description}</Text>
                ) : (
                  <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>Няма описание.</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerContainer: {
    position: "absolute",
    left: 16,
    zIndex: 9,
  },
  moreButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(8,12,24,0.76)",
  },
  moreButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  modalPanel: {
    width: "100%",
    height: "76%",
    maxHeight: "80%",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeading: { flex: 1, fontSize: 20, fontWeight: "800" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { flex: 1 },
  modalContent: { paddingBottom: 24 },
  titleSection: { paddingVertical: 16 },
  descriptionSection: { paddingVertical: 16 },
  divider: { width: "100%", height: StyleSheet.hairlineWidth },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "800" },
  description: { fontSize: 17, lineHeight: 25 },
  emptyDescription: { fontSize: 16, lineHeight: 24 },
});
