import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";

export default function LiveScreenRoot({
  fullscreen,
  style,
  children,
}: {
  fullscreen: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { keyboardOverlap } = useChatKeyboard();

  if (Platform.OS === "android") {
    return <View style={[style, { paddingBottom: keyboardOverlap }]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={style}
      behavior="padding"
      keyboardVerticalOffset={fullscreen ? 0 : 8}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
