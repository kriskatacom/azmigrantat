import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

export function useChatKeyboard() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const onShow = (event: KeyboardEvent) => {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      });
    };

    const onHide = () => {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        setKeyboardVisible(false);
        setKeyboardHeight(0);
      });
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
      cancelled = true;
      showSubscriptions.forEach((subscription) => subscription.remove());
      hideSubscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return {
    keyboardVisible,
    keyboardHeight,
  };
}

