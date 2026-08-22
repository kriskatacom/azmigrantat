import { requireNativeModule } from "expo";
import { Platform } from "react-native";

type CardOcrNativeModule = {
  recognizeText(imageUri: string): Promise<string>;
};

function loadNativeModule(): CardOcrNativeModule | null {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return requireNativeModule<CardOcrNativeModule>("CardOcr");
  } catch {
    return null;
  }
}

const nativeModule = loadNativeModule();

export async function recognizeCardText(imageUri: string): Promise<string | null> {
  if (!nativeModule) {
    return null;
  }

  return nativeModule.recognizeText(imageUri);
}
