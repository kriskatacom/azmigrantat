import { useChatKeyboard } from "@/hooks/chat/useChatKeyboard";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";

export default function LiveScreenRoot({
  style,
  children,
}: {
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
      keyboardVerticalOffset={0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
