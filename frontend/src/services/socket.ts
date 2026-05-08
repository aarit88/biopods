import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('🧬 BioPods Neural Link Established');
      this.socket?.emit('join_cluster', 'global');
    });

    return this.socket;
  }

  onTelemetryStream(callback: (data: any) => void) {
    this.socket?.on('telemetry:stream', callback);
  }

  onPodDangerUpdate(callback: (data: any) => void) {
    this.socket?.on('pod:danger:update', callback);
  }

  onThreatDetected(callback: (data: any) => void) {
    this.socket?.on('threat:detected', callback);
  }

  onImmuneResponseStarted(callback: (data: any) => void) {
    this.socket?.on('immune:response:started', callback);
  }

  onClusterHealthUpdate(callback: (data: any) => void) {
    this.socket?.on('cluster:health:update', callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
