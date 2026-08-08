import type { RealtimeServer } from '../types/events';
import type { SocketConnectionReadyPayload } from '../types/socket';
import { registerTypingEvents } from './typing.events';

export function registerSocketConnections(io: RealtimeServer): void {
    io.on('connection', async (socket) => {
        const user = socket.data.user;
        const userRoom = `user:${user.id}`;

        await socket.join(userRoom);

        registerTypingEvents(socket);

        const socketsInRoom = await io.in(userRoom).fetchSockets();

        console.log(`Потребител ${user.id} се свърза чрез socket ${socket.id}`);

        console.log(`Room ${userRoom} има ${socketsInRoom.length} активни връзки.`);

        const readyPayload: SocketConnectionReadyPayload = {
            user,
            socketId: socket.id,
        };

        socket.emit('connection:ready', readyPayload);

        socket.on('disconnect', (reason) => {
            console.log(`Потребител ${user.id} прекъсна връзката. Причина: ${reason}`);
        });
    });
}
