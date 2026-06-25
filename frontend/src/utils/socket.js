import { io } from 'socket.io-client';
import { socketUrl } from './env';

export let socket = null;

/**
 * Initializes the global Socket.io client connection.
 * @param {string} token JWT bearer token for authentication.
 * @returns {Socket|null} The socket connection instance.
 */
export const initSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }
  
  if (!token) {
    console.warn('[Socket] Initialization skipped: No auth token provided.');
    return null;
  }

  socket = io(socketUrl, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server successfully');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection authorization failed:', error.message);
  });

  return socket;
};

/**
 * Disconnects and destroys the active socket connection.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected manually');
  }
};
