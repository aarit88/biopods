import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketService.onPodUpdate((data) => {
      setLastTelemetry(data);
    });

    socketService.onDangerScore(() => {
      // In a real app, we'd update a danger heatmap state here
    });

    socketService.onThreatDetected((data) => {
      setAnomalies((prev) => [data, ...prev].slice(0, 50));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  return { isConnected, lastTelemetry, anomalies };
};
