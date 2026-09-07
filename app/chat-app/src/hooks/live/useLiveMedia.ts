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
  const [provider] = useState(() => getLiveMediaProvider());
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
    await provider.startStream(session);
    sessionRef.current = session;
    updateState({ connected: true, muted: false, cameraEnabled: true, session });
  }, [provider, updateState]);

  const joinStream = useCallback(async (session: LiveMediaSession) => {
    await provider.joinStream(session);
    sessionRef.current = session;
    updateState({ connected: true, muted: false, cameraEnabled: true, session });
  }, [provider, updateState]);

  const leaveStream = useCallback(async () => {
    if (sessionRef.current) {
      await provider.leaveStream(sessionRef.current);
    }
    sessionRef.current = null;
    updateState(initialState);
  }, [provider, updateState]);

  const stopStream = useCallback(async () => {
    if (sessionRef.current) {
      await provider.stopStream(sessionRef.current);
    }
    sessionRef.current = null;
    updateState(initialState);
  }, [provider, updateState]);

  const muteAudio = useCallback(async (muted: boolean) => {
    await provider.muteAudio(muted);
    updateState((current) => ({ ...current, muted }));
  }, [provider, updateState]);

  const toggleCamera = useCallback(async () => {
    const cameraEnabled = await provider.toggleCamera();
    updateState((current) => ({ ...current, cameraEnabled }));
    return cameraEnabled;
  }, [provider, updateState]);

  return {
    providerName: provider.name,
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
