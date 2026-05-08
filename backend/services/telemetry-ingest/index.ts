import { natsClient } from '../../shared/messaging/index.ts';
import { prisma } from '../../shared/db/index.ts';
import dotenv from 'dotenv';

dotenv.config();

const INTERVAL = 3000; // 3 seconds

const startIngestion = async () => {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  await prisma.$connect();
  console.log('🧬 BioPods Telemetry Ingest Engine: Synergizing with Cluster DNA...');

  setInterval(async () => {
    try {
      const pods = await prisma.pod.findMany();
      
      pods.forEach(pod => {
        const metrics = {
          cpu: Number(pod.cpuUsage) + (Math.random() * 10 - 5),
          memory: Number(pod.memoryUsage) + (Math.random() * 20 - 10),
          disk_io: Math.random() * 50,
          network_in: Math.random() * 200,
          network_out: Math.random() * 200,
          pvc_latency: Number(pod.pvcLatency)
        };

        const payload = {
          podId: pod.id,
          clusterId: pod.clusterId,
          podName: pod.podName,
          namespace: pod.namespace,
          metrics,
          timestamp: new Date()
        };

        natsClient.publish('telemetry.raw', payload);

        // If metrics are high, publish a danger score and an event for analysis
        if (metrics.cpu > 90 || metrics.memory > 90) {
          const eventData = {
            podId: pod.id,
            podName: pod.podName,
            eventType: metrics.cpu > 90 ? 'Critical CPU Saturation' : 'Severe Memory Leak',
            dangerScore: Math.max(metrics.cpu, metrics.memory),
            severity: 'CRITICAL',
            timestamp: new Date()
          };

          natsClient.publish('danger.score', eventData);
          natsClient.publish('danger.event', eventData);
        }
      });
    } catch (error) {
      console.error('❌ Telemetry Ingestion Cycle Failed:', error);
    }
  }, INTERVAL);
};

startIngestion().catch(console.error);
