import { useAppTheme } from "@/app/_layout";
import RemoteImage from "@/components/ui/RemoteImage";
import { copyText } from "@/utils/copy-text";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ImageFile = {
  uri: string;
  name: string;
  mimeType: string;
};

type ProfileIdentityCardProps = {
  name: string;
  publicCode?: string | null;
  imageUri?: string | null;
  coverUri?: string | null;
  isUploading: boolean;
  isUploadingCover: boolean;
  onPickImage: (file: ImageFile) => Promise<void>;
  onPickCover: (file: ImageFile) => Promise<void>;
};

async function pickImage(aspect: [number, number]): Promise<ImageFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Нужен е достъп до снимките",
      "Разрешете достъпа до снимките от настройките на телефона.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return null;
  }

  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}

async function takePhoto(aspect: [number, number]): Promise<ImageFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Нужен е достъп до камерата",
      "Разрешете достъпа до камерата от настройките на телефона.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return null;
  }

  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}

function chooseSource(
  title: string,
  aspect: [number, number],
  onPicked: (file: ImageFile) => Promise<void>,
) {
  Alert.alert(title, "Изберете източник", [
    {
      text: "Галерия",
      onPress: () => {
        void pickImage(aspect).then((file) => {
          if (file) {
            void onPicked(file);
          }
        });
      },
    },
    {
      text: "Камера",
      onPress: () => {
        void takePhoto(aspect).then((file) => {
          if (file) {
            void onPicked(file);
          }
        });
      },
    },
    { text: "Отказ", style: "cancel" },
  ]);
}

export default function ProfileIdentityCard({
  name,
  publicCode,
  imageUri,
  coverUri,
  isUploading,
  isUploadingCover,
  onPickImage,
  onPickCover,
}: ProfileIdentityCardProps) {
  const { theme } = useAppTheme();

  const handleChangePhoto = () => {
    if (isUploading || isUploadingCover) {
      return;
    }

    chooseSource("Профилна снимка", [1, 1], onPickImage);
  };

  const handleChangeCover = () => {
    if (isUploading || isUploadingCover) {
      return;
    }

    chooseSource("Корица за предавания на живо", [16, 9], onPickCover);
  };

  const handleCopyCode = async () => {
    if (!publicCode) {
      return;
    }

    await copyText(publicCode);
    Alert.alert("Код на профила", publicCode);
  };

  const busyLabel = isUploadingCover
    ? "Качване на корицата..."
    : isUploading
      ? "Качване на снимката..."
      : "Корицата се показва на предаванията ви на живо.";

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
        onPress={handleChangeCover}
        disabled={isUploading || isUploadingCover}
        accessibilityRole="button"
        accessibilityLabel="Преглед и промяна на корицата"
        style={styles.coverButton}
      >
        {coverUri ? (
          <RemoteImage uri={coverUri} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: "#111827" }]}>
            <FontAwesome name="picture-o" size={22} color="rgba(255,255,255,0.55)" />
            <Text style={styles.coverPlaceholderText}>Добавете корица</Text>
          </View>
        )}
        {isUploadingCover ? (
          <View style={styles.uploadOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.uploadOverlayText}>Качване...</Text>
          </View>
        ) : (
          <View style={[styles.coverBadge, { backgroundColor: theme.colors.primary }]}>
            <FontAwesome name="camera" size={11} color={theme.colors.buttonText} />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleChangePhoto}
        disabled={isUploading || isUploadingCover}
        accessibilityRole="button"
        accessibilityLabel="Преглед и промяна на профилната снимка"
        style={[
          styles.avatarButton,
          { borderColor: theme.colors.card },
        ]}
      >
        {imageUri ? (
          <RemoteImage uri={imageUri} style={styles.avatar} />
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
        {isUploading ? (
          <View style={styles.avatarUploadOverlay} pointerEvents="none">
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : (
          <View
            style={[
              styles.cameraBadge,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <FontAwesome name="camera" size={12} color={theme.colors.buttonText} />
          </View>
        )}
      </TouchableOpacity>

      <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        {busyLabel}
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
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 18,
  },
  coverButton: {
    width: "100%",
    height: 128,
    backgroundColor: "#0b1220",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverPlaceholderText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "700",
  },
  coverBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadOverlayText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
  },
  avatarButton: {
    position: "relative",
    marginTop: -40,
    borderWidth: 4,
    borderRadius: 52,
  },
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
  name: { fontSize: 20, fontWeight: "800", marginTop: 10, paddingHorizontal: 18 },
  hint: { fontSize: 13, textAlign: "center", paddingHorizontal: 18, marginTop: 4 },
  codeRow: {
    alignSelf: "stretch",
    marginTop: 12,
    marginHorizontal: 18,
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
