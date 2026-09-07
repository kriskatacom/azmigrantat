import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

export function useLiveFullscreenBack(
  fullscreen: boolean,
  onExitFullscreen: () => void,
): void {
  useFocusEffect(
    useCallback(() => {
      if (!fullscreen) {
        return;
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        onExitFullscreen();
        return true;
      });

      return () => {
        subscription.remove();
      };
    }, [fullscreen, onExitFullscreen]),
  );
}
