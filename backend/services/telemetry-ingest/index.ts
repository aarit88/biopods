import { natsClient } from '../../shared/messaging/index.ts';
import dotenv from 'dotenv';

dotenv.config();

const INTERVAL = 2000; // 2 seconds

const mockPods = [
  { id: 'pod-alpha-1', clusterId: 'c1', namespace: 'default' },
  { id: 'pod-beta-2', clusterId: 'c1', namespace: 'production' },
  { id: 'pod-sigma-9', clusterId: 'c2', namespace: 'bio-core' }
];

const startIngestion = async () => {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  console.log('Telemetry Ingest Engine active...');

  setInterval(() => {
    mockPods.forEach(pod => {
      const metrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 1024,
        disk_io: Math.random() * 50,
        network_in: Math.random() * 200,
        network_out: Math.random() * 200
      };

      const payload = {
        podId: pod.id,
        clusterId: pod.clusterId,
        namespace: pod.namespace,
        metrics,
        timestamp: new Date()
      };

      // In a real scenario, we'd check against thresholds or previous state in Redis here
      natsClient.publish('telemetry.raw', payload);
    });
  }, INTERVAL);
};

startIngestion().catch(console.error);
