import type { Express, Request, Response } from 'express';
import type { types } from 'mediasoup';

import { MediaRoomManager, MediaSignalingError } from '../media/media-room-manager';
import type { MediaSession, MediaSessionManager } from '../media/media-session-manager';

export function registerMediaRoutes(
  app: Express,
  sessions: MediaSessionManager,
  rooms: MediaRoomManager,
): void {
  app.post('/v1/rooms/:roomId/transports', asyncRoute(async (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;

    const direction = request.body?.direction;
    if (direction !== 'send' && direction !== 'recv') {
      respondError(response, new MediaSignalingError('DIRECTION_INVALID', 'Невалидна transport посока.', 422));
      return;
    }

    try {
      const transport = await rooms.createTransport(session, direction);
      response.status(201).json({
        success: true,
        id: transport.id,
        direction,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        ...(transport.sctpParameters ? { sctpParameters: transport.sctpParameters } : {}),
      });
    } catch (error) {
      respondError(response, error);
    }
  }));

  app.post('/v1/rooms/:roomId/transports/:transportId/connect', asyncRoute(async (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;
    const dtlsParameters = objectBody(request.body?.dtlsParameters ?? request.body?.dtls_parameters);
    if (!dtlsParameters) {
      respondError(response, new MediaSignalingError('DTLS_INVALID', 'Липсват валидни DTLS параметри.', 422));
      return;
    }

    try {
      await rooms.connectTransport(session, routeParam(request.params.transportId), dtlsParameters as types.DtlsParameters);
      response.json({ success: true });
    } catch (error) {
      respondError(response, error);
    }
  }));

  app.post('/v1/rooms/:roomId/transports/:transportId/producers', asyncRoute(async (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;
    const kind = request.body?.kind;
    const rtpParameters = objectBody(request.body?.rtpParameters ?? request.body?.rtp_parameters);
    if ((kind !== 'audio' && kind !== 'video') || !rtpParameters) {
      respondError(response, new MediaSignalingError('PRODUCER_INVALID', 'Невалидни producer параметри.', 422));
      return;
    }

    try {
      const producer = await rooms.createProducer(
        session,
        routeParam(request.params.transportId),
        kind,
        rtpParameters as types.RtpParameters,
        objectBody(request.body?.appData ?? request.body?.app_data) ?? undefined,
      );
      response.status(201).json({ success: true, id: producer.id, kind: producer.kind });
    } catch (error) {
      respondError(response, error);
    }
  }));

  app.get('/v1/rooms/:roomId/producers', (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;

    response.json({
      success: true,
      producers: rooms.listProducers(session).map((producer) => ({ id: producer.id, kind: producer.kind })),
    });
  });

  app.post('/v1/rooms/:roomId/transports/:transportId/consumers', asyncRoute(async (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;
    const producerId = request.body?.producerId ?? request.body?.producer_id;
    const rtpCapabilities = objectBody(request.body?.rtpCapabilities ?? request.body?.rtp_capabilities);
    if (typeof producerId !== 'string' || !rtpCapabilities) {
      respondError(response, new MediaSignalingError('CONSUMER_INVALID', 'Невалидни consumer параметри.', 422));
      return;
    }

    try {
      const consumer = await rooms.createConsumer(
        session,
        routeParam(request.params.transportId),
        producerId,
        rtpCapabilities as types.RtpCapabilities,
      );
      response.status(201).json({
        success: true,
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
      });
    } catch (error) {
      respondError(response, error);
    }
  }));

  app.post('/v1/rooms/:roomId/consumers/:consumerId/resume', asyncRoute(async (request, response) => {
    const session = authorize(request, response, sessions);
    if (!session) return;

    try {
      await rooms.resumeConsumer(session, routeParam(request.params.consumerId));
      response.json({ success: true });
    } catch (error) {
      respondError(response, error);
    }
  }));

  app.delete('/v1/rooms/:roomId/transports/:transportId', (request, response) => {
    closeResource(request, response, sessions, (session) => rooms.closeTransport(session, routeParam(request.params.transportId)));
  });
  app.delete('/v1/rooms/:roomId/producers/:producerId', (request, response) => {
    closeResource(request, response, sessions, (session) => rooms.closeProducer(session, routeParam(request.params.producerId)));
  });
  app.delete('/v1/rooms/:roomId/consumers/:consumerId', (request, response) => {
    closeResource(request, response, sessions, (session) => rooms.closeConsumer(session, routeParam(request.params.consumerId)));
  });
}

function authorize(request: Request, response: Response, sessions: MediaSessionManager): MediaSession | null {
  const authorization = request.header('Authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const sessionId = bearer || request.header('X-Media-Session-Id')?.trim() || '';
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    response.status(401).json({ success: false, message: 'Невалидна media session.' });
    return null;
  }

  if (session.room_id !== request.params.roomId) {
    response.status(403).json({ success: false, message: 'Media session-ът не принадлежи на този room.' });
    return null;
  }

  return session;
}

function closeResource(
  request: Request,
  response: Response,
  sessions: MediaSessionManager,
  close: (session: MediaSession) => void,
): void {
  const session = authorize(request, response, sessions);
  if (!session) return;

  try {
    close(session);
    response.json({ success: true });
  } catch (error) {
    respondError(response, error);
  }
}

function objectBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function respondError(response: Response, error: unknown): void {
  const status = error instanceof MediaSignalingError ? error.status : 500;
  response.status(status).json({
    success: false,
    message: error instanceof Error ? error.message : 'Media signaling error.',
  });
}

function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response): void => {
    void handler(request, response).catch((error: unknown) => respondError(response, error));
  };
}
