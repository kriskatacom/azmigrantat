import type { MediaStream } from "react-native-webrtc";

export type LiveMediaRole = "streamer" | "viewer" | "speaker";

export type LiveMediaSession = {
  liveId: number;
  role: LiveMediaRole;
  provider: string;
  mediaRoomId: string | null;
  mediaNodeId?: string;
  sessionId?: string;
  participantId?: number | null;
  signalingEndpoint?: string;
  signalingUrl?: string;
  rtcHost?: string;
  routerId?: string | null;
  routerRtpCapabilities?: unknown;
};

export interface LiveMediaProvider {
  readonly name: string;
  startStream(session: LiveMediaSession): Promise<void>;
  joinStream(session: LiveMediaSession): Promise<void>;
  leaveStream(session: LiveMediaSession): Promise<void>;
  stopStream(session: LiveMediaSession): Promise<void>;
  startTalking(session: LiveMediaSession): Promise<void>;
  stopTalking(): Promise<void>;
  muteAudio(muted: boolean): Promise<void>;
  toggleCamera(): Promise<boolean>;
  switchCamera(): Promise<"user" | "environment">;
  getState?(): LiveMediaState;
}

export type LiveMediaState = {
  connected: boolean;
  error: string | null;
  muted: boolean;
  cameraEnabled: boolean;
  cameraFacing: "user" | "environment";
  session: LiveMediaSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  talking: boolean;
};
