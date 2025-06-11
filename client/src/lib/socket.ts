import { io, Socket } from "socket.io-client";

class SocketManager {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NODE_ENV === 'production' 
      ? 'file-share-w2g2.onrender.com'
      : 'localhost:5000';
    const socketUrl = `${protocol}//${host}`;
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
