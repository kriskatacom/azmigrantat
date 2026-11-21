import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { subscribeToVideoVolumeButtons } from "../../modules/video-volume-buttons";

const VIDEO_VOLUME_KEY = "azmigrantat.video.volume";
const DEFAULT_VIDEO_VOLUME = 1;
const HARDWARE_VOLUME_STEP = 1 / 15;

type VideoVolumeContextValue = {
  volume: number;
  setVolume: Dispatch<SetStateAction<number>>;
};

const VideoVolumeContext = createContext<VideoVolumeContextValue | null>(null);

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VIDEO_VOLUME;
  return Math.max(0, Math.min(1, value));
}

export function VideoVolumeProvider({ children }: PropsWithChildren) {
  const [volume, setVolumeState] = useState(DEFAULT_VIDEO_VOLUME);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(VIDEO_VOLUME_KEY)
      .then((stored) => {
        if (!active || stored === null) return;
        setVolumeState(clampVolume(Number(stored)));
      })
      .catch((error) => {
        console.warn("[VideoVolume] Настройката за звук не можа да бъде заредена.", error);
      })
      .finally(() => {
        if (active) setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      void SecureStore.setItemAsync(VIDEO_VOLUME_KEY, String(volume)).catch((error) => {
        console.warn("[VideoVolume] Настройката за звук не можа да бъде запазена.", error);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [isLoaded, volume]);

  useEffect(() => subscribeToVideoVolumeButtons((direction) => {
    setVolumeState((current) => clampVolume(
      current + (direction === "up" ? HARDWARE_VOLUME_STEP : -HARDWARE_VOLUME_STEP),
    ));
  }), []);

  const setVolume = useCallback<Dispatch<SetStateAction<number>>>((next) => {
    setVolumeState((current) => clampVolume(
      typeof next === "function" ? next(current) : next,
    ));
  }, []);

  const value = useMemo(() => ({ volume, setVolume }), [setVolume, volume]);

  return (
    <VideoVolumeContext.Provider value={value}>
      {children}
    </VideoVolumeContext.Provider>
  );
}

export function useVideoVolume(): VideoVolumeContextValue {
  const context = useContext(VideoVolumeContext);
  if (!context) throw new Error("useVideoVolume must be used inside VideoVolumeProvider.");
  return context;
}
