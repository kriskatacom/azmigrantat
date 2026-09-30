import type { Express } from "express";

import { config } from "../config";
import type {
  MediaSessionManager,
  MediaSessionRole,
} from "../media/media-session-manager";

export function registerSessionRoutes(
  app: Express,
  sessions: MediaSessionManager,
  cleanupSession: (sessionId: string) => void,
): void {
  app.post("/v1/rooms/:roomId/session", (request, response) => {
    if (request.header("X-Media-Node-Secret") !== config.internalSecret) {
      response
        .status(401)
        .json({ success: false, message: "Невалиден media node ключ." });
      return;
    }

    const role = request.body?.role;

    if (role !== "streamer" && role !== "viewer" && role !== "speaker") {
      response
        .status(422)
        .json({ success: false, message: "Невалидна media session роля." });
      return;
    }

    const participantId = request.body?.participant_id;
    if (
      participantId !== undefined &&
      participantId !== null &&
      (!Number.isInteger(participantId) || participantId <= 0)
    ) {
      response
        .status(422)
        .json({ success: false, message: "Невалиден participant ID." });
      return;
    }

    try {
      const session = sessions.create(
        request.params.roomId,
        role as MediaSessionRole,
        participantId ?? null,
      );
      response.status(201).json({ success: true, session });
    } catch (error) {
      response.status(503).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Media session creation failed.",
      });
    }
  });

  app.delete("/v1/rooms/:roomId/session/:sessionId", (request, response) => {
    if (request.header("X-Media-Node-Secret") !== config.internalSecret) {
      response.status(401).json({ success: false, message: "Невалиден media node ключ." });
      return;
    }

    const session = sessions.get(request.params.sessionId);
    if (!session || session.room_id !== request.params.roomId) {
      response.status(404).json({ success: false, message: "Media session not found." });
      return;
    }

    cleanupSession(session.session_id);
    sessions.remove(session.session_id);
    response.json({ success: true });
  });
}
