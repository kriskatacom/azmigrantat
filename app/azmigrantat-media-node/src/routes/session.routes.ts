import type { Express } from 'express';

import { config } from '../config';
import type { MediaSessionManager, MediaSessionRole } from '../media/media-session-manager';

export function registerSessionRoutes(app: Express, sessions: MediaSessionManager): void {
  app.post('/v1/rooms/:roomId/session', (request, response) => {
    if (request.header('X-Media-Node-Secret') !== config.internalSecret) {
      response.status(401).json({ success: false, message: 'Невалиден media node ключ.' });
      return;
    }

    const role = request.body?.role;

    if (role !== 'streamer' && role !== 'viewer') {
      response.status(422).json({ success: false, message: 'Невалидна media session роля.' });
      return;
    }

    try {
      const session = sessions.create(request.params.roomId, role as MediaSessionRole);
      response.status(201).json({ success: true, session });
    } catch (error) {
      response.status(503).json({
        success: false,
        message: error instanceof Error ? error.message : 'Media session creation failed.',
      });
    }
  });
}
