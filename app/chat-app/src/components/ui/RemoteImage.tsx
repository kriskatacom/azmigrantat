import {
  isUnresolvableHostError,
  toFallbackFileUrl,
  toPublicFileUrl,
} from "@/utils/public-file-url";
import { Image, type ImageProps } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type RemoteImageProps = Omit<ImageProps, "source"> & {
  uri?: string | null;
  source?: ImageProps["source"];
};

const shownAlerts = new Set<string>();

async function describeLoadFailure(
  url: string,
  imageError: string,
): Promise<string> {
  let network = "Мрежовата проверка не беше направена.";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*" },
    });
    const contentType = response.headers.get("content-type") ?? "липсва";
    const contentLength = response.headers.get("content-length") ?? "липсва";
    const preview = (await response.clone().text()).slice(0, 280);
    network = [
      `HTTP ${response.status} ${response.statusText || ""}`.trim(),
      `Content-Type: ${contentType}`,
      `Content-Length: ${contentLength}`,
      preview ? `Body: ${preview}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    network = `Fetch грешка: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  return `Image грешка:\n${imageError}\n\nURL:\n${url}\n\n${network}`;
}

export default function RemoteImage({
  uri,
  source,
  style,
  contentFit = "cover",
  cachePolicy = "memory-disk",
  onError,
  ...props
}: RemoteImageProps) {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const rawUri =
    uri ??
    (source &&
    typeof source === "object" &&
    !Array.isArray(source) &&
    "uri" in source
      ? String(source.uri ?? "")
      : null);

  const cdnUri = useMemo(() => toPublicFileUrl(rawUri), [rawUri]);
  const fallbackUri = useMemo(() => toFallbackFileUrl(rawUri), [rawUri]);
  const activeUri = useFallback ? fallbackUri ?? cdnUri : cdnUri;

  const showDetails = useCallback((details: string) => {
    Alert.alert("Снимката не се зареди", details);
  }, []);

  const handleError = useCallback(
    (event: { error?: string; nativeEvent?: { error?: string } }) => {
      const imageError =
        event.error ||
        event.nativeEvent?.error ||
        "Неизвестна грешка от Image.";
      onError?.(event as { error: string });

      if (
        !useFallback &&
        fallbackUri &&
        fallbackUri !== activeUri &&
        isUnresolvableHostError(imageError)
      ) {
        setUseFallback(true);
        setErrorText(null);
        return;
      }

      if (!activeUri) {
        setErrorText(imageError);
        return;
      }

      void describeLoadFailure(activeUri, imageError).then((details) => {
        setErrorText(details);
        console.error("[RemoteImage]", details);
        if (!shownAlerts.has(activeUri)) {
          shownAlerts.add(activeUri);
          showDetails(details);
        }
      });
    },
    [activeUri, fallbackUri, onError, showDetails, useFallback],
  );

  if (!activeUri) {
    return (
      <View style={[styles.errorBox, style as StyleProp<ViewStyle>]}>
        <Text style={styles.errorTitle}>Няма URL</Text>
        <Text style={styles.errorBody} numberOfLines={4}>
          {String(rawUri ?? "null")}
        </Text>
      </View>
    );
  }

  if (errorText) {
    return (
      <Pressable
        onPress={() => showDetails(errorText)}
        style={[styles.errorBox, style as StyleProp<ViewStyle>]}
      >
        <Text style={styles.errorTitle}>Грешка при снимка</Text>
        <Text style={styles.errorBody} numberOfLines={8}>
          {errorText}
        </Text>
      </Pressable>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri: activeUri }}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      recyclingKey={activeUri}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: "#7f1d1d",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    overflow: "hidden",
  },
  errorTitle: {
    color: "#fecaca",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  errorBody: {
    color: "#fff1f2",
    fontSize: 9,
    lineHeight: 12,
    textAlign: "left",
    width: "100%",
  },
});
