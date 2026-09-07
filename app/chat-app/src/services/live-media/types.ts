export type LiveMediaRole = "streamer" | "viewer";

export type LiveMediaSession = {
  liveId: number;
  role: LiveMediaRole;
  provider: string;
  mediaRoomId: string | null;
};

export interface LiveMediaProvider {
  readonly name: string;
  startStream(session: LiveMediaSession): Promise<void>;
  joinStream(session: LiveMediaSession): Promise<void>;
  leaveStream(session: LiveMediaSession): Promise<void>;
  stopStream(session: LiveMediaSession): Promise<void>;
  muteAudio(muted: boolean): Promise<void>;
  toggleCamera(): Promise<boolean>;
}

export type LiveMediaState = {
  connected: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  session: LiveMediaSession | null;
};
