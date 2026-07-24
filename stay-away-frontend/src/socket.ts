import { io } from 'socket.io-client';

// Если задана переменная VITE_SERVER_URL (на хостинге), берем её, иначе localhost:3001
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});