import { useAppTheme } from "@/app/_layout";
import { copyText } from "@/utils/copy-text";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileIdentityCardProps = {
  name: string;
  publicCode?: string | null;
  imageUri?: string | null;
  isUploading: boolean;
  onPickImage: (file: {
    uri: string;
    name: string;
    mimeType: string;
  }) => Promise<void>;
};

export default function ProfileIdentityCard({
  name,
  publicCode,
  imageUri,
  isUploading,
  onPickImage,
}: ProfileIdentityCardProps) {
  const { theme } = useAppTheme();

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Нужен е достъп до снимките",
        "Разрешете достъпа до снимките от настройките на телефона.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) {
      return;
    }

    await onPickImage({
      uri: asset.uri,
      name: asset.fileName ?? `profile-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Нужен е достъп до камерата",
        "Разрешете достъпа до камерата от настройките на телефона.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) {
      return;
    }

    await onPickImage({
      uri: asset.uri,
      name: asset.fileName ?? `profile-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleChangePhoto = () => {
    if (isUploading) {
      return;
    }

    Alert.alert("Профилна снимка", "Изберете източник", [
      { text: "Галерия", onPress: () => void pickFromLibrary() },
      { text: "Камера", onPress: () => void takePhoto() },
      { text: "Отказ", style: "cancel" },
    ]);
  };

  const handleCopyCode = async () => {
    if (!publicCode) {
      return;
    }

    await copyText(publicCode);
    Alert.alert("Код на профила", publicCode);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleChangePhoto}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel="Преглед и промяна на профилната снимка"
        style={styles.avatarButton}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.placeholder,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <FontAwesome name="user" size={36} color={theme.colors.textSecondary} />
          </View>
        )}
        <View
          style={[
            styles.cameraBadge,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <FontAwesome name="camera" size={12} color={theme.colors.buttonText} />
        </View>
      </TouchableOpacity>

      <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        {isUploading ? "Качване на снимката..." : "Натиснете снимката, за да я смените."}
      </Text>

      {publicCode ? (
        <TouchableOpacity
          onPress={() => void handleCopyCode()}
          style={[
            styles.codeRow,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Копирай кода на профила"
        >
          <View style={styles.codeText}>
            <Text style={[styles.codeLabel, { color: theme.colors.textSecondary }]}>
              Вашият код
            </Text>
            <Text selectable style={[styles.code, { color: theme.colors.text }]}>
              {publicCode}
            </Text>
          </View>
          <FontAwesome name="copy" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  avatarButton: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  hint: { fontSize: 13, textAlign: "center" },
  codeRow: {
    width: "100%",
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  codeText: { flex: 1, gap: 2 },
  codeLabel: { fontSize: 12, fontWeight: "600" },
  code: { fontSize: 20, fontWeight: "800", letterSpacing: 1.4 },
});
