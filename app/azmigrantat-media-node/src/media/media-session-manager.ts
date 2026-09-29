import { randomUUID } from 'node:crypto';

import { config } from '../config';
import type { MediaNode } from './media-node';

export type MediaSessionRole = 'streamer' | 'viewer' | 'speaker';

export type MediaSession = {
  session_id: string;
  room_id: string;
  role: MediaSessionRole;
  node_id: string;
  signaling_url: string;
  signaling_endpoint: string;
  router_rtp_capabilities: unknown;
  participant_id?: number | null;
};

export class MediaSessionManager {
  private readonly sessions = new Map<string, MediaSession>();

  constructor(private readonly mediaNode: MediaNode) {}

  create(roomId: string, role: MediaSessionRole, participantId?: number | null): MediaSession {
    const normalizedRoomId = roomId.trim();

    if (normalizedRoomId === '') {
      throw new Error('Room ID is required.');
    }

    const session = {
      session_id: randomUUID(),
      room_id: normalizedRoomId,
      role,
      node_id: config.nodeId,
      signaling_url: config.signalingUrl,
      signaling_endpoint: `${config.signalingUrl}/v1/rooms/${encodeURIComponent(normalizedRoomId)}`,
      router_rtp_capabilities: this.mediaNode.getRouterRtpCapabilities(),
      participant_id: participantId ?? null,
    };

    this.sessions.set(session.session_id, session);
    return session;
  }

  get(sessionId: string): MediaSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
