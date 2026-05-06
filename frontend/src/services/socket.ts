import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('Neural Link Established with Visualization Hub');
      this.socket?.emit('join_cluster', 'global');
    });

    return this.socket;
  }

  onPodUpdate(callback: (data: any) => void) {
    this.socket?.on('podHealthUpdate', callback);
  }

  onDangerScore(callback: (data: any) => void) {
    this.socket?.on('dangerScore', callback);
  }

  onThreatDetected(callback: (data: any) => void) {
    this.socket?.on('threatDetected', callback);
  }

  onActionExecuted(callback: (data: any) => void) {
    this.socket?.on('actionExecuted', callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
