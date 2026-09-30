import type { types } from 'mediasoup';
import type { Server, Socket } from 'socket.io';

import { MediaRoomManager } from './media-room-manager';
import type { MediaSessionManager } from './media-session-manager';

type SessionState = { sessionId: string };

export class SfuSignaling {
  constructor(
    private readonly io: Server,
    private readonly sessionManager: MediaSessionManager,
    private readonly rooms: MediaRoomManager,
  ) {}

  register(): void {
    this.io.on('connection', (socket) => void this.handleConnection(socket));
  }

  private async handleConnection(socket: Socket): Promise<void> {
    const value = socket.handshake.auth?.session_id;
    const session = typeof value === 'string' ? this.sessionManager.get(value) : null;

    if (!session) {
      socket.emit('sfu:error', { code: 'SESSION_INVALID', message: 'Невалидна media session.' });
      socket.disconnect(true);
      return;
    }

    const state: SessionState = { sessionId: session.session_id };
    await socket.join(this.roomName(session.room_id));
    socket.emit('sfu:ready', {
      session_id: session.session_id,
      room_id: session.room_id,
      role: session.role,
      router_rtp_capabilities: session.router_rtp_capabilities,
      producer_ids: this.rooms.listProducers(session).map((producer) => producer.id),
    });

    socket.on('transport:create', (payload, callback) => {
      void this.createTransport(session.session_id, payload, callback);
    });
    socket.on('transport:connect', (payload, callback) => {
      void this.connectTransport(session.session_id, payload, callback);
    });
    socket.on('producer:create', (payload, callback) => {
      void this.createProducer(session.session_id, socket, payload, callback);
    });
    socket.on('consumer:create', (payload, callback) => {
      void this.createConsumer(session.session_id, payload, callback);
    });
    socket.on('consumer:resume', (payload, callback) => {
      void this.resumeConsumer(session.session_id, payload, callback);
    });
    socket.on('disconnect', () => {
      this.rooms.cleanupSession(state.sessionId);
      this.sessionManager.remove(state.sessionId);
    });
  }

  private async createTransport(sessionId: string, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    const direction = this.field(payload, 'direction');
    if (!session || (direction !== 'send' && direction !== 'recv')) {
      callback({ ok: false, code: 'DIRECTION_INVALID', message: 'Невалидна transport посока.' });
      return;
    }

    try {
      const transport = await this.rooms.createTransport(session, direction);
      callback({
        ok: true,
        transport: {
          id: transport.id,
          direction,
          ice_parameters: transport.iceParameters,
          ice_candidates: transport.iceCandidates,
          dtls_parameters: transport.dtlsParameters,
          sctp_parameters: transport.sctpParameters,
        },
      });
    } catch (error) {
      callback({ ok: false, code: this.code(error), message: this.message(error) });
    }
  }

  private async connectTransport(sessionId: string, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    const transportId = this.field(payload, 'transport_id');
    const dtlsParameters = this.objectField(payload, 'dtls_parameters');
    if (!session || typeof transportId !== 'string' || !dtlsParameters) {
      callback({ ok: false, code: 'TRANSPORT_INVALID', message: 'Невалиден transport или DTLS payload.' });
      return;
    }

    try {
      await this.rooms.connectTransport(session, transportId, dtlsParameters as types.DtlsParameters);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, code: this.code(error), message: this.message(error) });
    }
  }

  private async createProducer(sessionId: string, socket: Socket, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    const transportId = this.field(payload, 'transport_id');
    const kind = this.field(payload, 'kind');
    const rtpParameters = this.objectField(payload, 'rtp_parameters');
    if (!session || typeof transportId !== 'string' || (kind !== 'audio' && kind !== 'video') || !rtpParameters) {
      callback({ ok: false, code: 'PRODUCER_INVALID', message: 'Невалиден producer payload.' });
      return;
    }

    try {
      const producer = await this.rooms.createProducer(session, transportId, kind, rtpParameters as types.RtpParameters);
      socket.to(this.roomName(session.room_id)).emit('sfu:producer-available', {
        producer_id: producer.id,
        kind: producer.kind,
        participant_id: session.participant_id ?? null,
      });
      callback({ ok: true, producer_id: producer.id });
    } catch (error) {
      callback({ ok: false, code: this.code(error), message: this.message(error) });
    }
  }

  private async createConsumer(sessionId: string, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    const transportId = this.field(payload, 'transport_id');
    const producerId = this.field(payload, 'producer_id');
    const rtpCapabilities = this.objectField(payload, 'rtp_capabilities');
    if (!session || typeof transportId !== 'string' || typeof producerId !== 'string' || !rtpCapabilities) {
      callback({ ok: false, code: 'CONSUMER_INVALID', message: 'Невалиден consumer payload.' });
      return;
    }

    try {
      const consumer = await this.rooms.createConsumer(session, transportId, producerId, rtpCapabilities as types.RtpCapabilities);
      callback({
        ok: true,
        consumer: {
          id: consumer.id,
          producer_id: consumer.producerId,
          kind: consumer.kind,
          rtp_parameters: consumer.rtpParameters,
          type: consumer.type,
        },
      });
    } catch (error) {
      callback({ ok: false, code: this.code(error), message: this.message(error) });
    }
  }

  private async resumeConsumer(sessionId: string, payload: unknown, callback: (value: unknown) => void): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    const consumerId = this.field(payload, 'consumer_id');
    if (!session || typeof consumerId !== 'string') {
      callback({ ok: false, code: 'CONSUMER_INVALID', message: 'Consumer не е намерен.' });
      return;
    }

    try {
      await this.rooms.resumeConsumer(session, consumerId);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, code: this.code(error), message: this.message(error) });
    }
  }

  private roomName(roomId: string): string {
    return `sfu:${roomId}`;
  }

  private field(payload: unknown, key: string): unknown {
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>)[key] : undefined;
  }

  private objectField(payload: unknown, key: string): Record<string, unknown> | null {
    const value = this.field(payload, key);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private code(error: unknown): string {
    return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'SFU_ERROR';
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'SFU signaling error.';
  }
}
