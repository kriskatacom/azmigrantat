import { useCallback, useEffect, useRef, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";
import type { CallType } from "@/services/video-call";

async function requestMediaPermissions(callType: CallType): Promise<void> {
  if (Platform.OS !== "android") return;

  const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (callType === "video") {
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }
  const result = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.filter(
    (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );

  if (denied.length > 0) {
    throw new Error(
      callType === "video"
        ? "Необходими са разрешения за камера и микрофон за видео обаждане."
        : "Необходимо е разрешение за микрофон за аудио обаждане.",
    );
  }
}

export function useLocalMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (callType: CallType = "video") => {
    if (localStreamRef.current) {
      if (
        callType === "video" &&
        localStreamRef.current.getVideoTracks().length === 0
      ) {
        await requestMediaPermissions("video");
        const cameraStream = await mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user" },
        });
        cameraStream.getVideoTracks().forEach((track) => {
          localStreamRef.current?.addTrack(track);
        });
        const upgradedStream = new MediaStream(
          localStreamRef.current.getTracks(),
        );
        localStreamRef.current = upgradedStream;
        setLocalStream(upgradedStream);
      }
      return localStreamRef.current;
    }

    await requestMediaPermissions(callType);

    const stream = await mediaDevices.getUserMedia({
      audio: true,

      video:
        callType === "video"
          ? {
              facingMode: "user",
            }
          : false,
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
