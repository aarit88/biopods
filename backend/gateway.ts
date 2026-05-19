import express from 'express';
import cors from 'cors';
import { cytokineBus } from './shared/messaging/cytokine_bus.ts';
import dotenv from 'dotenv';
import metricsRoute from './routes/metrics.ts';
import { pollAndSaveMetrics } from './services/prometheusService.ts';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Prometheus Metrics Route
app.use('/api/metrics', metricsRoute);

// REST API for external telemetry ingestion (used by the dashboard injection buttons)
app.post('/api/telemetry', async (req, res) => {
  const { podId, metrics, type } = req.body;
  await cytokineBus.publish('telemetry.raw', { podId, metrics, timestamp: new Date() });

  // Check thresholds — if dangerous, immediately publish to system-threats
  if (metrics.cpu > 80 || metrics.memory > 90 || metrics.temp > 70) {
    console.log(`[Patrol] INJECTED Threat Detected in ${podId}!`);
    await cytokineBus.publish('system-threats', {
      podId,
      type: type || 'Threshold Exceeded',
      severity: metrics.cpu > 95 || metrics.temp > 85 ? 'HIGH' : 'MEDIUM',
      metrics,
      timestamp: new Date()
    });
  }

  res.json({ status: 'ACK', podId });
});

// Simulated Pod Fleet matching database names for frontend UI integration
const FLEET = [
  { podId: 'telemetry-engine', baseCpu: 55, baseMem: 60, baseTemp: 45 },
  { podId: 'bio-auth-service', baseCpu: 30, baseMem: 40, baseTemp: 35 },
  { podId: 'threat-scanner', baseCpu: 20, baseMem: 35, baseTemp: 30 },
];

// Periodic Patrol Routine (Simulated)
let patrolIndex = 0;

// Prometheus Polling Scheduler (every 5 seconds)
setInterval(async () => {
  try {
    await pollAndSaveMetrics();
  } catch (err) {
    console.error("Prometheus Polling Error:", err);
  }
}, 5000);

setInterval(async () => {
  const pod = FLEET[patrolIndex % FLEET.length];
  patrolIndex++;

  const metrics = {
    cpu: pod.baseCpu + Math.random() * 50,
    memory: pod.baseMem + Math.random() * 40,
    temp: pod.baseTemp + Math.random() * 35,
    // Network in KB/s — realistic simulated values between 50–800 KB/s
    network: Math.round(50 + Math.random() * 750),
  };

  await cytokineBus.publish('telemetry.raw', { podId: pod.podId, metrics, timestamp: new Date() });

  // Check thresholds
  if (metrics.cpu > 80 || metrics.memory > 90 || metrics.temp > 70) {
    console.log(`[Patrol] Threat Detected in ${pod.podId}!`);
    await cytokineBus.publish('system-threats', {
      podId: pod.podId,
      type: metrics.cpu > 90 ? 'Critical CPU Saturation' : 'Temperature Spike',
      severity: metrics.cpu > 95 ? 'HIGH' : 'MEDIUM',
      metrics,
      timestamp: new Date()
    });
  }
}, 5000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bio Pods Gateway Core running on port ${PORT}`);
  console.log(`Cytokine Patrol Routine Active — monitoring ${FLEET.length} pods...`);
});
