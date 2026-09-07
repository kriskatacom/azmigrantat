import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { config } from './config';
import { registerCallRoutes } from './routes/call.routes';
import { registerHealthRoutes } from './routes/health.routes';
import { registerInternalRoutes } from './routes/internal.routes';
import { registerLiveInternalRoutes } from './routes/live.internal.routes';
import { CallService } from './services/calls/call-service';
import { InMemoryCallStore } from './services/calls/call-store';
import { PhpCallAuthorizationProvider } from './services/calls/call-authorization.provider';
import { PhpTypingAuthorizationProvider } from './services/conversations/typing-authorization.provider';
import { PhpLiveAuthorizationProvider } from './services/live/live-authorization.provider';
import { PhpLivePersistenceProvider } from './services/live/live-persistence.provider';
import { LiveService } from './services/live/live-service';
import { InMemoryLiveStore } from './services/live/live-store';
import { PhpNotificationClient } from './services/notifications/php-notification.client';
import { CallNotifications } from './services/fcm/call-notifications';
import { FirebaseFcmSender } from './services/fcm/fcm-client';
import { PhpPushTokenProvider } from './services/fcm/php-push-token.provider';
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

const callStore = new InMemoryCallStore();
const callNotifications = config.fcmEnabled
    ? new CallNotifications(new FirebaseFcmSender(new PhpPushTokenProvider()))
    : undefined;
const callAuthorization = new PhpCallAuthorizationProvider();
const calls = new CallService(
    io,
    callStore,
    callNotifications,
    callAuthorization,
    () => new Date(),
    new PhpNotificationClient(),
);

registerCallRoutes(app, calls);

const lives = new LiveService(
    io,
    new InMemoryLiveStore(),
    new PhpLiveAuthorizationProvider(),
    new PhpLivePersistenceProvider(),
);

registerLiveInternalRoutes(app, lives);
registerSocketConnections(io, calls, new PhpTypingAuthorizationProvider(), lives);

const callExpirySweep = setInterval(() => {
    void calls.expirePendingCalls();
}, 1_000);
callExpirySweep.unref();

httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Realtime сървърът работи на http://localhost:${config.port}`);
});
