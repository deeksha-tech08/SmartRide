import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO Connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }
}

// Export as a singleton
const socketService = new SocketService();
export default socketService;
