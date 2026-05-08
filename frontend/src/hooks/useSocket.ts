import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [immuneResponses, setImmuneResponses] = useState<any[]>([]);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketService.onTelemetryStream((data) => {
      setLastTelemetry(data);
    });

    socketService.onPodDangerUpdate((data) => {
      // Update anomalies list with real-time danger updates
      setAnomalies((prev) => {
        const exists = prev.find(a => a.podId === data.podId);
        if (exists) {
          return prev.map(a => a.podId === data.podId ? { ...a, ...data } : a);
        }
        return [data, ...prev].slice(0, 50);
      });
    });

    socketService.onThreatDetected((data) => {
      setAnomalies((prev) => [data, ...prev].slice(0, 50));
    });

    socketService.onImmuneResponseStarted((data) => {
      setImmuneResponses((prev) => [data, ...prev].slice(0, 20));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  return { isConnected, lastTelemetry, anomalies, immuneResponses };
};
