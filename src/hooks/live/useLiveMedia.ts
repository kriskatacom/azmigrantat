import { getLiveMediaProvider } from "@/services/live-media";
import type { LiveMediaRole, LiveMediaSession, LiveMediaState } from "@/services/live-media";
import { useCallback, useRef, useState } from "react";

const initialState: LiveMediaState = {
  connected: false,
  muted: false,
  cameraEnabled: true,
  session: null,
};

export function useLiveMedia() {
  const providerRef = useRef(getLiveMediaProvider());
  const sessionRef = useRef<LiveMediaSession | null>(null);
  const [state, setState] = useState<LiveMediaState>(initialState);

  const startStream = useCallback(async (session: LiveMediaSession) => {
    await providerRef.current.startStream(session);
    sessionRef.current = session;
    setState({ connected: true, muted: false, cameraEnabled: true, session });
  }, []);

  const joinStream = useCallback(async (session: LiveMediaSession) => {
    await providerRef.current.joinStream(session);
    sessionRef.current = session;
    setState({ connected: true, muted: false, cameraEnabled: true, session });
  }, []);

  const leaveStream = useCallback(async () => {
    if (sessionRef.current) {
      await providerRef.current.leaveStream(sessionRef.current);
    }
    sessionRef.current = null;
    setState(initialState);
  }, []);

  const stopStream = useCallback(async () => {
    if (sessionRef.current) {
      await providerRef.current.stopStream(sessionRef.current);
    }
    sessionRef.current = null;
    setState(initialState);
  }, []);

  const muteAudio = useCallback(async (muted: boolean) => {
    await providerRef.current.muteAudio(muted);
    setState((current) => ({ ...current, muted }));
  }, []);

  const toggleCamera = useCallback(async () => {
    const cameraEnabled = await providerRef.current.toggleCamera();
    setState((current) => ({ ...current, cameraEnabled }));
    return cameraEnabled;
  }, []);

  return {
    providerName: providerRef.current.name,
    role: (state.session?.role ?? null) as LiveMediaRole | null,
    ...state,
    startStream,
    joinStream,
    leaveStream,
    stopStream,
    muteAudio,
    toggleCamera,
  };
}
