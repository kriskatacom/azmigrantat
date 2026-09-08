import { parseMessageLinks } from "@/utils/chat/message-links";
import * as WebBrowser from "expo-web-browser";
import { Text, type StyleProp, type TextStyle } from "react-native";

interface LinkifiedMessageTextProps {
  content: string;
  color: string;
  linkColor: string;
  style?: StyleProp<TextStyle>;
}

export default function LinkifiedMessageText({ content, color, linkColor, style }: LinkifiedMessageTextProps) {
  return (
    <Text selectable style={[style, { color }]}>
      {parseMessageLinks(content).map((part, index) =>
        part.url ? (
          <Text
            key={`${part.url}-${index}`}
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(part.url!)}
            style={{ color: linkColor, textDecorationLine: "underline", fontWeight: "600" }}
          >
            {part.value}
          </Text>
        ) : part.value,
      )}
    </Text>
  );
}
