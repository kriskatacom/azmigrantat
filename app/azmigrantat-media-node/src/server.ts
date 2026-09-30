import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { config } from './config';
import { MediaNode } from './media/media-node';
import { MediaRoomManager } from './media/media-room-manager';
import { MediaSessionManager } from './media/media-session-manager';
import { SfuSignaling } from './media/sfu-signaling';
import { MediaNodeRegistry } from './registry/media-node-registry';
import { registerHealthRoutes } from './routes/health.routes';
import { registerMediaRoutes } from './routes/media.routes';
import { registerSessionRoutes } from './routes/session.routes';

async function main(): Promise<void> {
  const mediaNode = new MediaNode();
  await mediaNode.start();
  const registry = new MediaNodeRegistry(mediaNode);
  const sessions = new MediaSessionManager(mediaNode);
  const rooms = new MediaRoomManager(mediaNode);

  try {
    await registry.start();
  } catch (error) {
    await mediaNode.close();
    throw error;
  }

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });
  new SfuSignaling(io, sessions, rooms).register();

  app.disable('x-powered-by');
  app.use(express.json());
  registerHealthRoutes(app, mediaNode, registry);
  registerSessionRoutes(app, sessions, (sessionId) => rooms.cleanupSession(sessionId));
  registerMediaRoutes(app, sessions, rooms);

  const server = httpServer.listen(config.port, config.host, () => {
    console.log(
      `[media-node] ${config.nodeId} listening on ${config.host}:${config.port} (advertised host: ${config.advertisedHost})`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[media-node] received ${signal}, shutting down`);
    server.close();
    rooms.closeAll();
    await registry.close();
    await mediaNode.close();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void main().catch((error: unknown) => {
  console.error('[media-node] failed to start', error);
  process.exitCode = 1;
});
