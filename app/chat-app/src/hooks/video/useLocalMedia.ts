import { useCallback, useEffect, useRef, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";

async function requestMediaPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.filter(
    (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );

  if (denied.length > 0) {
    throw new Error("Необходими са разрешения за камера и микрофон за обаждане.");
  }
}

export function useLocalMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    await requestMediaPermissions();

    const stream = await mediaDevices.getUserMedia({
      audio: true,

      video: {
        facingMode: "user",
      },
    });

    localStreamRef.current = stream;
    setLocalStream(stream);

    return stream;
  }, []);

  const stopCamera = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      localStreamRef.current = null;
    };
  }, []);

  return {
    localStream,
    localStreamRef,
    startCamera,
    stopCamera,
  };
}
