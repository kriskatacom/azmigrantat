import { useEffect, useMemo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const MAX_ZOOM_SCALE = 3;
const FULLSCREEN_TRIGGER_SCALE = 1.12;
const FULLSCREEN_EXIT_SCALE = 0.96;
const FULLSCREEN_MIN_PREVIEW_SCALE = 0.84;
const RESET_SPRING = { damping: 22, stiffness: 240, mass: 0.7 };

type Props = {
  active: boolean;
  width: number;
  height: number;
  children: ReactNode;
  onZoomChange?: (zooming: boolean) => void;
  onRequestFullscreen?: () => void;
  onRequestExitFullscreen?: () => void;
};

function clamp(value: number, minimum: number, maximum: number): number {
  "worklet";
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Native-thread pinch interaction shared by every full-screen video surface.
 * The two-finger pan deliberately avoids competing with the feed's one-finger
 * vertical paging gesture.
 */
export default function TikTokVideoGestureSurface({
  active,
  width,
  height,
  children,
  onZoomChange,
  onRequestFullscreen,
  onRequestExitFullscreen,
}: Props) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const startTranslationX = useSharedValue(0);
  const startTranslationY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const minimumGestureScale = useSharedValue(1);

  const reset = useMemo(() => () => {
    "worklet";
    scale.set(withSpring(1, RESET_SPRING));
    translationX.set(withSpring(0, RESET_SPRING));
    translationY.set(withSpring(0, RESET_SPRING));
  }, [scale, translationX, translationY]);

  useEffect(() => {
    if (active) return;
    scale.set(1);
    translationX.set(0);
    translationY.set(0);
  }, [active, scale, translationX, translationY]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .enabled(active)
      .shouldCancelWhenOutside(false)
      .onStart((event) => {
        startScale.set(scale.get());
        startTranslationX.set(translationX.get());
        startTranslationY.set(translationY.get());
        startFocalX.set(event.focalX);
        startFocalY.set(event.focalY);
        minimumGestureScale.set(1);
        if (onZoomChange) runOnJS(onZoomChange)(true);
      })
      .onUpdate((event) => {
        const initialScale = startScale.get();
        const minimumScale = onRequestExitFullscreen && initialScale <= 1.01
          ? FULLSCREEN_MIN_PREVIEW_SCALE
          : 1;
        const nextScale = clamp(initialScale * event.scale, minimumScale, MAX_ZOOM_SCALE);
        minimumGestureScale.set(Math.min(minimumGestureScale.get(), event.scale));
        const scaleRatio = nextScale / initialScale;
        const focalOffsetX = startFocalX.get() - width / 2;
        const focalOffsetY = startFocalY.get() - height / 2;
        const focalMovementX = event.focalX - startFocalX.get();
        const focalMovementY = event.focalY - startFocalY.get();
        const maxX = Math.max(0, ((nextScale - 1) * width) / 2);
        const maxY = Math.max(0, ((nextScale - 1) * height) / 2);

        scale.set(nextScale);
        translationX.set(clamp(
          startTranslationX.get() + focalOffsetX * (1 - scaleRatio) + focalMovementX,
          -maxX,
          maxX,
        ));
        translationY.set(clamp(
          startTranslationY.get() + focalOffsetY * (1 - scaleRatio) + focalMovementY,
          -maxY,
          maxY,
        ));
      })
      .onFinalize(() => {
        if (onRequestFullscreen) {
          const shouldOpenFullscreen = scale.get() >= FULLSCREEN_TRIGGER_SCALE;
          reset();
          if (onZoomChange) runOnJS(onZoomChange)(false);
          if (shouldOpenFullscreen) runOnJS(onRequestFullscreen)();
          return;
        }

        if (onRequestExitFullscreen && startScale.get() <= 1.01) {
          const shouldExitFullscreen = minimumGestureScale.get() <= FULLSCREEN_EXIT_SCALE;
          reset();
          if (onZoomChange) runOnJS(onZoomChange)(false);
          if (shouldExitFullscreen) runOnJS(onRequestExitFullscreen)();
          return;
        }

        if (scale.get() <= 1.01) {
          reset();
          if (onZoomChange) runOnJS(onZoomChange)(false);
        }
      });

    const pan = Gesture.Pan()
      .enabled(active)
      .averageTouches(true)
      .manualActivation(true)
      .shouldCancelWhenOutside(false)
      .onTouchesMove((_event, state) => {
        if (scale.get() > 1.01) state.activate();
        else state.fail();
      })
      .onStart(() => {
        startTranslationX.set(translationX.get());
        startTranslationY.set(translationY.get());
      })
      .onUpdate((event) => {
        const currentScale = scale.get();
        const maxX = Math.max(0, ((currentScale - 1) * width) / 2);
        const maxY = Math.max(0, ((currentScale - 1) * height) / 2);
        translationX.set(clamp(startTranslationX.get() + event.translationX, -maxX, maxX));
        translationY.set(clamp(startTranslationY.get() + event.translationY, -maxY, maxY));
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [
    active,
    height,
    minimumGestureScale,
    onZoomChange,
    onRequestExitFullscreen,
    onRequestFullscreen,
    reset,
    scale,
    startFocalX,
    startFocalY,
    startScale,
    startTranslationX,
    startTranslationY,
    translationX,
    translationY,
    width,
  ]);

  const zoomStyle = useAnimatedStyle(() => {
    const currentScale = scale.get();
    const maxX = Math.max(0, ((currentScale - 1) * width) / 2);
    const maxY = Math.max(0, ((currentScale - 1) * height) / 2);
    const translateX = clamp(translationX.get(), -maxX, maxX);
    const translateY = clamp(translationY.get(), -maxY, maxY);

    return {
      transform: [
        { translateX },
        { translateY },
        { scale: currentScale },
      ],
      zIndex: currentScale > 1 ? 50 : 0,
    };
  });

  return (
    <View style={[styles.viewport, { width, height }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false} style={[styles.surface, zoomStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: "hidden", backgroundColor: "#000" },
  surface: { flex: 1 },
});
