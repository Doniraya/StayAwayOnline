import { io } from 'socket.io-client';

// Вычисление динамического хоста для подключения с мобильных устройств по IP в Wi-Fi сети
const getSocketUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
  return `http://${hostname}:3001`;
};

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});