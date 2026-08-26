import { getLiveMediaProvider } from "@/services/live-media";
import type { LiveMediaRole, LiveMediaSession, LiveMediaState } from "@/services/live-media";
import { useCallback, useEffect, useRef, useState } from "react";

const initialState: LiveMediaState = {
  connected: false,
  muted: false,
  cameraEnabled: true,
  session: null,
};

export function useLiveMedia() {
  const providerRef = useRef(getLiveMediaProvider());
  const sessionRef = useRef<LiveMediaSession | null>(null);
  const mountedRef = useRef(false);
  const [state, setState] = useState<LiveMediaState>(initialState);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((next: LiveMediaState | ((current: LiveMediaState) => LiveMediaState)) => {
    if (!mountedRef.current) {
      return;
    }

    setState(next);
  }, []);

  const startStream = useCallback(async (session: LiveMediaSession) => {
    await providerRef.current.startStream(session);
    sessionRef.current = session;
    updateState({ connected: true, muted: false, cameraEnabled: true, session });
  }, [updateState]);

  const joinStream = useCallback(async (session: LiveMediaSession) => {
    await providerRef.current.joinStream(session);
    sessionRef.current = session;
    updateState({ connected: true, muted: false, cameraEnabled: true, session });
  }, [updateState]);

  const leaveStream = useCallback(async () => {
    if (sessionRef.current) {
      await providerRef.current.leaveStream(sessionRef.current);
    }
    sessionRef.current = null;
    updateState(initialState);
  }, [updateState]);

  const stopStream = useCallback(async () => {
    if (sessionRef.current) {
      await providerRef.current.stopStream(sessionRef.current);
    }
    sessionRef.current = null;
    updateState(initialState);
  }, [updateState]);

  const muteAudio = useCallback(async (muted: boolean) => {
    await providerRef.current.muteAudio(muted);
    updateState((current) => ({ ...current, muted }));
  }, [updateState]);

  const toggleCamera = useCallback(async () => {
    const cameraEnabled = await providerRef.current.toggleCamera();
    updateState((current) => ({ ...current, cameraEnabled }));
    return cameraEnabled;
  }, [updateState]);

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
