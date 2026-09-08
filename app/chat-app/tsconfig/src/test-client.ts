import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const ACCESS_TOKEN =
    '1e118aae0a089d050438fdcfc3afb55fc5e72fa50e2fb2de3c26d9d19bee8f3e71816c09e272da9b';

const socket = io(SOCKET_URL, {
    auth: {
        token: ACCESS_TOKEN,
    },
    transports: ['websocket'],
});

socket.on('connect', () => {
    console.log('Socket връзката е установена.');
    console.log('Socket ID:', socket.id);
});

socket.on('connection:ready', (payload) => {
    console.log('Получено connection:ready:');
    console.log(payload);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:');
    console.error(error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Socket връзката е прекъсната:', reason);
});
