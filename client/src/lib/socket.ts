import { io, Socket } from "socket.io-client";

class SocketManager {
  private socket: Socket | null = null;
  private readonly uri: string;

  constructor() {
    this.uri = import.meta.env.VITE_API_URL || window.location.origin;
  }

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    
    // Disconnect any existing, disconnected socket instance before creating a new one
    if (this.socket) {
      this.socket.disconnect();
    }
    
    console.log('[SocketManager] 🔌 Connecting to server at:', this.uri);
    this.socket = io(this.uri, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[SocketManager] ✅ Connected with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketManager] 🔌 Disconnected:', reason);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('[SocketManager] 🔌 Manually disconnecting socket.');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketManager = new SocketManager();
