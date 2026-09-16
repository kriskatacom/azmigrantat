import { randomUUID } from 'node:crypto';

import { config } from '../config';
import type { MediaNode } from './media-node';

export type MediaSessionRole = 'streamer' | 'viewer';

export type MediaSession = {
  session_id: string;
  room_id: string;
  role: MediaSessionRole;
  node_id: string;
  signaling_url: string;
  signaling_endpoint: string;
  router_rtp_capabilities: unknown;
};

export class MediaSessionManager {
  private readonly sessions = new Map<string, MediaSession>();

  constructor(private readonly mediaNode: MediaNode) {}

  create(roomId: string, role: MediaSessionRole): MediaSession {
    const normalizedRoomId = roomId.trim();

    if (normalizedRoomId === '') {
      throw new Error('Room ID is required.');
    }

    const session = {
      session_id: randomUUID(),
      room_id: normalizedRoomId,
      role,
      node_id: config.nodeId,
      signaling_url: `http://${config.advertisedHost}:${config.port}`,
      signaling_endpoint: `http://${config.advertisedHost}:${config.port}/v1/rooms/${encodeURIComponent(normalizedRoomId)}`,
      router_rtp_capabilities: this.mediaNode.getRouterRtpCapabilities(),
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
