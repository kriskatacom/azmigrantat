import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { config } from './config';
import { registerHealthRoutes } from './routes/health.routes';
import { registerInternalRoutes } from './routes/internal.routes';
import { registerSocketAuthMiddleware } from './socket/auth.middleware';
import { registerSocketConnections } from './socket/connection';
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from './types/events';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    },
);

registerHealthRoutes(app);
registerInternalRoutes(app, io);

registerSocketAuthMiddleware(io);
registerSocketConnections(io);

httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Realtime сървърът работи на http://localhost:${config.port}`);
});
