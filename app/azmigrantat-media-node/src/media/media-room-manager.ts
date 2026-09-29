import type { types } from 'mediasoup';

import type { MediaNode } from './media-node';
import type { MediaSession } from './media-session-manager';

export type TransportDirection = 'send' | 'recv';

export class MediaSignalingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MediaSignalingError';
  }
}

type TransportState = {
  transport: types.WebRtcTransport;
  sessionId: string;
  direction: TransportDirection;
};

type ProducerState = {
  producer: types.Producer;
  sessionId: string;
  transportId: string;
};

type ConsumerState = {
  consumer: types.Consumer;
  sessionId: string;
  transportId: string;
  producerId: string;
};

export type MediaRoomState = {
  roomId: string;
  transports: Map<string, TransportState>;
  producers: Map<string, ProducerState>;
  consumers: Map<string, ConsumerState>;
};

export class MediaRoomManager {
  private readonly rooms = new Map<string, MediaRoomState>();

  constructor(private readonly mediaNode: MediaNode) {
    this.mediaNode.onClose(() => this.closeAll());
  }

  async createTransport(
    session: MediaSession,
    direction: TransportDirection,
  ): Promise<types.WebRtcTransport> {
    if (session.role === 'viewer' && direction !== 'recv') {
      throw new MediaSignalingError('ROLE_FORBIDDEN', 'Viewer може да създава само recv transport.', 403);
    }

    const transport = await this.mediaNode.createWebRtcTransport();
    const room = this.getOrCreateRoom(session.room_id);
    room.transports.set(transport.id, { transport, sessionId: session.session_id, direction });
    transport.observer.once('close', () => this.removeTransport(session.room_id, transport.id, true));

    console.log(`[media-node] room ${session.room_id} transport ${transport.id} created`);
    return transport;
  }

  async connectTransport(
    session: MediaSession,
    transportId: string,
    dtlsParameters: types.DtlsParameters,
  ): Promise<void> {
    const transport = this.getOwnedTransport(session, transportId);
    await transport.transport.connect({ dtlsParameters });
    console.log(`[media-node] room ${session.room_id} transport ${transportId} connected`);
  }

  async createProducer(
    session: MediaSession,
    transportId: string,
    kind: types.MediaKind,
    rtpParameters: types.RtpParameters,
    appData?: types.AppData,
  ): Promise<types.Producer> {
    if (session.role !== 'streamer' && session.role !== 'speaker') {
      throw new MediaSignalingError('ROLE_FORBIDDEN', 'Тази media session няма право да създава producer.', 403);
    }
    if (session.role === 'speaker' && kind !== 'audio') {
      throw new MediaSignalingError('ROLE_FORBIDDEN', 'Speaker session може да предава само audio.', 403);
    }

    const transport = this.getOwnedTransport(session, transportId);
    if (transport.direction !== 'send') {
      throw new MediaSignalingError('TRANSPORT_DIRECTION_INVALID', 'Producer изисква send transport.', 422);
    }

    const producer = await transport.transport.produce({ kind, rtpParameters, appData });
    const room = this.getOrCreateRoom(session.room_id);
    room.producers.set(producer.id, { producer, sessionId: session.session_id, transportId });
    producer.on('transportclose', () => this.removeProducer(session.room_id, producer.id, true));
    producer.observer.once('close', () => this.removeProducer(session.room_id, producer.id, true));

    console.log(`[media-node] room ${session.room_id} producer ${producer.id} ${producer.kind} created`);
    return producer;
  }

  listProducers(session: MediaSession): types.Producer[] {
    return [...(this.rooms.get(session.room_id)?.producers.values() ?? [])]
      .filter(({ producer }) => !producer.closed)
      .map(({ producer }) => producer);
  }

  async createConsumer(
    session: MediaSession,
    transportId: string,
    producerId: string,
    rtpCapabilities: types.RtpCapabilities,
  ): Promise<types.Consumer> {
    const transport = this.getOwnedTransport(session, transportId);
    if (transport.direction !== 'recv') {
      throw new MediaSignalingError('TRANSPORT_DIRECTION_INVALID', 'Consumer изисква recv transport.', 422);
    }

    const producer = this.rooms.get(session.room_id)?.producers.get(producerId);
    if (!producer || producer.producer.closed) {
      throw new MediaSignalingError('PRODUCER_NOT_FOUND', 'Producer не е намерен.', 404);
    }

    if (!this.mediaNode.canConsume(producerId, rtpCapabilities)) {
      throw new MediaSignalingError('CANNOT_CONSUME', 'Router не може да consume-не този producer.', 422);
    }

    const consumer = await transport.transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });
    const room = this.getOrCreateRoom(session.room_id);
    room.consumers.set(consumer.id, { consumer, sessionId: session.session_id, transportId, producerId });
    consumer.on('producerclose', () => {
      consumer.close();
    });
    consumer.on('transportclose', () => this.removeConsumer(session.room_id, consumer.id, false));
    consumer.observer.once('close', () => this.removeConsumer(session.room_id, consumer.id, false));

    console.log(`[media-node] room ${session.room_id} consumer ${consumer.id} for producer ${producerId} created`);
    return consumer;
  }

  async resumeConsumer(session: MediaSession, consumerId: string): Promise<void> {
    const consumer = this.getOwnedConsumer(session, consumerId);
    await consumer.consumer.resume();
    console.log(`[media-node] room ${session.room_id} consumer ${consumerId} resumed`);
  }

  closeTransport(session: MediaSession, transportId: string): void {
    const transport = this.getOwnedTransport(session, transportId);
    transport.transport.close();
    this.removeTransport(session.room_id, transportId, true);
    console.log(`[media-node] room ${session.room_id} transport ${transportId} closed`);
  }

  closeProducer(session: MediaSession, producerId: string): void {
    const producer = this.getOwnedProducer(session, producerId);
    producer.producer.close();
    this.removeProducer(session.room_id, producerId, true);
    console.log(`[media-node] room ${session.room_id} producer ${producerId} closed`);
  }

  closeConsumer(session: MediaSession, consumerId: string): void {
    const consumer = this.getOwnedConsumer(session, consumerId);
    consumer.consumer.close();
    this.removeConsumer(session.room_id, consumerId, true);
    console.log(`[media-node] room ${session.room_id} consumer ${consumerId} closed`);
  }

  cleanupSession(sessionId: string): void {
    for (const room of this.rooms.values()) {
      const transports = [...room.transports.values()].filter((item) => item.sessionId === sessionId);
      const producers = [...room.producers.values()].filter((item) => item.sessionId === sessionId);
      const consumers = [...room.consumers.values()].filter((item) => item.sessionId === sessionId);

      for (const consumer of consumers) consumer.consumer.close();
      for (const producer of producers) producer.producer.close();
      for (const transport of transports) transport.transport.close();
    }
  }

  closeAll(): void {
    for (const room of this.rooms.values()) {
      for (const consumer of room.consumers.values()) consumer.consumer.close();
      for (const producer of room.producers.values()) producer.producer.close();
      for (const transport of room.transports.values()) transport.transport.close();
    }
    this.rooms.clear();
  }

  private getOwnedTransport(session: MediaSession, transportId: string): TransportState {
    const transport = this.rooms.get(session.room_id)?.transports.get(transportId);
    if (!transport) {
      throw new MediaSignalingError('TRANSPORT_NOT_FOUND', 'Transport не е намерен.', 404);
    }
    if (transport.sessionId !== session.session_id) {
      throw new MediaSignalingError('TRANSPORT_FORBIDDEN', 'Transport-ът не принадлежи на тази media session.', 403);
    }
    return transport;
  }

  private getOwnedProducer(session: MediaSession, producerId: string): ProducerState {
    const producer = this.rooms.get(session.room_id)?.producers.get(producerId);
    if (!producer) {
      throw new MediaSignalingError('PRODUCER_NOT_FOUND', 'Producer не е намерен.', 404);
    }
    if (producer.sessionId !== session.session_id) {
      throw new MediaSignalingError('PRODUCER_FORBIDDEN', 'Producer-ът не принадлежи на тази media session.', 403);
    }
    return producer;
  }

  private getOwnedConsumer(session: MediaSession, consumerId: string): ConsumerState {
    const consumer = this.rooms.get(session.room_id)?.consumers.get(consumerId);
    if (!consumer) {
      throw new MediaSignalingError('CONSUMER_NOT_FOUND', 'Consumer не е намерен.', 404);
    }
    if (consumer.sessionId !== session.session_id) {
      throw new MediaSignalingError('CONSUMER_FORBIDDEN', 'Consumer-ът не принадлежи на тази media session.', 403);
    }
    return consumer;
  }

  private getOrCreateRoom(roomId: string): MediaRoomState {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const room: MediaRoomState = {
      roomId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  private removeTransport(roomId: string, transportId: string, closeChildren: boolean): void {
    const room = this.rooms.get(roomId);
    const transport = room?.transports.get(transportId);
    if (!room || !transport) return;

    if (closeChildren) {
      for (const consumer of room.consumers.values()) {
        if (consumer.transportId === transportId) consumer.consumer.close();
      }
      for (const producer of room.producers.values()) {
        if (producer.transportId === transportId) producer.producer.close();
      }
    }

    room.transports.delete(transportId);
    this.removeEmptyRoom(roomId);
  }

  private removeProducer(roomId: string, producerId: string, closeConsumers: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (closeConsumers) {
      for (const consumer of room.consumers.values()) {
        if (consumer.producerId === producerId) consumer.consumer.close();
      }
    }

    room.producers.delete(producerId);
    this.removeEmptyRoom(roomId);
  }

  private removeConsumer(roomId: string, consumerId: string, _closedExplicitly: boolean): void {
    const room = this.rooms.get(roomId);
    room?.consumers.delete(consumerId);
    this.removeEmptyRoom(roomId);
  }

  private removeEmptyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.transports.size === 0 && room.producers.size === 0 && room.consumers.size === 0) {
      this.rooms.delete(roomId);
    }
  }
}
