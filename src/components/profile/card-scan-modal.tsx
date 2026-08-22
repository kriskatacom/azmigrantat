import { useAppTheme } from "@/app/_layout";
import AppButton from "@/components/ui/AppButton";
import { parseCardScanText } from "@/services/card-format";
import { FontAwesome } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { recognizeCardText } from "@/services/card-scan";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type CardScanModalProps = {
  visible: boolean;
  onClose: () => void;
  onScanned: (result: {
    number: string;
    expiry: string | null;
    holderName: string | null;
  }) => void;
};

export default function CardScanModal({
  visible,
  onClose,
  onScanned,
}: CardScanModalProps) {
  const { theme } = useAppTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (isScanning) {
      return;
    }

    setError(null);
    setIsScanning(true);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("Снимката не можа да бъде направена.");
      }

      const text = await recognizeCardText(photo.uri);
      if (text === null) {
        throw new Error(
          "Сканирането изисква нативно приложение. Изградете отново с expo run:android или expo run:ios.",
        );
      }

      const parsed = parseCardScanText(text);
      if (!parsed) {
        throw new Error(
          "Не разчетохме номера на картата. Дръжте картата в рамката и опитайте отново.",
        );
      }

      onScanned(parsed);
      onClose();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Картата не можа да бъде сканирана.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={visible}
      presentationStyle="fullScreen"
    >
      <View style={[styles.screen, { backgroundColor: "#0b1220" }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Затвори сканирането"
            style={styles.close}
          >
            <FontAwesome name="times" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Сканирай карта</Text>
          <View style={styles.close} />
        </View>

        {!permission?.granted ? (
          <View style={styles.center}>
            <Text style={styles.help}>
              Нужен е достъп до камерата, за да сканирате картата.
            </Text>
            <AppButton title="Разреши камерата" onPress={() => void requestPermission()} />
          </View>
        ) : (
          <>
            <View style={styles.cameraWrap}>
              <CameraView
                ref={cameraRef}
                facing="back"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.frame} />
                <Text style={styles.hint}>
                  Поставете картата в рамката. Номерът трябва да се вижда ясно.
                </Text>
              </View>
              {isScanning ? (
                <View style={styles.busy}>
                  <ActivityIndicator color="#ffffff" size="large" />
                  <Text style={styles.hint}>Разчитане на картата…</Text>
                </View>
              ) : null}
            </View>
            {error ? (
              <Text style={[styles.error, { color: theme.colors.danger }]}>
                {error}
              </Text>
            ) : null}
            <View style={styles.footer}>
              <AppButton
                title="Снимай картата"
                loading={isScanning}
                onPress={() => void handleScan()}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 48 },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 20,
  },
  frame: {
    width: "100%",
    aspectRatio: 1.58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  hint: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  center: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  help: { color: "#ffffff", fontSize: 16, lineHeight: 22, textAlign: "center" },
  error: {
    marginTop: 12,
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footer: { padding: 20, paddingBottom: 32 },
});
