import { useCallback, useEffect, useRef, useState } from "react";
import { mediaDevices, MediaStream } from "react-native-webrtc";

export function useLocalMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

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
