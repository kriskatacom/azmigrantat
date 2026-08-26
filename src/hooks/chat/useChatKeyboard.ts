import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

export function useChatKeyboard() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const windowHeight = Dimensions.get("window").height;
      const overlap = Math.max(0, Math.round(windowHeight - event.endCoordinates.screenY));

      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      setKeyboardOverlap(overlap);
    };

    const onHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setKeyboardOverlap(0);
    };

    const showSubscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillShow", onShow),
            Keyboard.addListener("keyboardDidShow", onShow),
          ]
        : [Keyboard.addListener("keyboardDidShow", onShow)];

    const hideSubscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillHide", onHide),
            Keyboard.addListener("keyboardDidHide", onHide),
          ]
        : [Keyboard.addListener("keyboardDidHide", onHide)];

    return () => {
      showSubscriptions.forEach((subscription) => subscription.remove());
      hideSubscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return {
    keyboardVisible,
    keyboardHeight,
    keyboardOverlap,
  };
}
