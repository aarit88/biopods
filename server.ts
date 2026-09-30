import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-biopods-key';

// ── In-Memory BioPods Immune State Store ─────────────────────────────────────
const store = {
  user: {
    id: 'user-admin-01',
    fullName: 'System Administrator',
    email: 'admin@biopods.io',
    password: 'password',
    role: 'ADMIN',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  cluster: {
    id: 'cluster-primary',
    clusterName: 'BioPods-Primary-Cluster',
    environment: 'production',
    region: 'edge-industrial-zone-1',
    kubernetesVersion: 'v1.30.0',
    totalNodes: 3,
    status: 'healthy',
    immunityScore: 94.6,
    createdAt: new Date(Date.now() - 86400000 * 7),
  },
  nodes: [
    {
      id: 'node-alpha-01',
      clusterId: 'cluster-primary',
      nodeName: 'node-alpha-01',
      cpuUsage: 44.2,
      memoryUsage: 61.3,
      diskUsage: 35.2,
      networkUsage: 22.1,
      nodeStatus: 'healthy',
      healthScore: 94.1,
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: 'node-beta-02',
      clusterId: 'cluster-primary',
      nodeName: 'node-beta-02',
      cpuUsage: 87.9,
      memoryUsage: 91.2,
      diskUsage: 73.5,
      networkUsage: 65.4,
      nodeStatus: 'warning',
      healthScore: 68.5,
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: 'node-gamma-03',
      clusterId: 'cluster-primary',
      nodeName: 'node-gamma-03',
      cpuUsage: 32.4,
      memoryUsage: 46.1,
      diskUsage: 29.0,
      networkUsage: 19.5,
      nodeStatus: 'healthy',
      healthScore: 98.4,
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
  ],
  pods: [
    {
      id: 'pod-auth-01',
      clusterId: 'cluster-primary',
      nodeId: 'node-alpha-01',
      podName: 'bio-auth-service',
      namespace: 'core-services',
      cpuUsage: 24.5,
      memoryUsage: 45.2,
      pvcLatency: 4.2,
      networkTraffic: 120.4,
      podStatus: 'healthy',
      dangerLevel: 'low',
      immunityState: 'stable',
      dependencyCount: 5,
      createdAt: new Date(Date.now() - 86400000 * 4),
    },
    {
      id: 'pod-telemetry-02',
      clusterId: 'cluster-primary',
      nodeId: 'node-beta-02',
      podName: 'telemetry-engine',
      namespace: 'immune-core',
      cpuUsage: 91.8,
      memoryUsage: 96.4,
      pvcLatency: 45.6,
      networkTraffic: 402.2,
      podStatus: 'critical',
      dangerLevel: 'high',
      immunityState: 'infected',
      dependencyCount: 12,
      createdAt: new Date(Date.now() - 86400000 * 4),
    },
    {
      id: 'pod-scanner-03',
      clusterId: 'cluster-primary',
      nodeId: 'node-alpha-01',
      podName: 'threat-scanner',
      namespace: 'immune-core',
      cpuUsage: 22.0,
      memoryUsage: 38.0,
      pvcLatency: 2.1,
      networkTraffic: 85.0,
      podStatus: 'healthy',
      dangerLevel: 'low',
      immunityState: 'stable',
      dependencyCount: 4,
      createdAt: new Date(Date.now() - 86400000 * 4),
    },
    {
      id: 'pod-power-04',
      clusterId: 'cluster-primary',
      nodeId: 'node-gamma-03',
      podName: 'power-grid-link',
      namespace: 'industrial-scada',
      cpuUsage: 35.2,
      memoryUsage: 48.0,
      pvcLatency: 6.0,
      networkTraffic: 210.0,
      podStatus: 'healthy',
      dangerLevel: 'low',
      immunityState: 'stable',
      dependencyCount: 8,
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'pod-ctrl-05',
      clusterId: 'cluster-primary',
      nodeId: 'node-beta-02',
      podName: 'control-system-01',
      namespace: 'industrial-scada',
      cpuUsage: 64.0,
      memoryUsage: 72.0,
      pvcLatency: 14.5,
      networkTraffic: 320.0,
      podStatus: 'warning',
      dangerLevel: 'medium',
      immunityState: 'unstable',
      dependencyCount: 9,
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'pod-turbine-06',
      clusterId: 'cluster-primary',
      nodeId: 'node-gamma-03',
      podName: 'turbine-core-01',
      namespace: 'turbines',
      cpuUsage: 42.0,
      memoryUsage: 52.0,
      pvcLatency: 8.0,
      networkTraffic: 140.0,
      podStatus: 'healthy',
      dangerLevel: 'low',
      immunityState: 'stable',
      dependencyCount: 6,
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
  ],
  dangerEvents: [
    {
      id: 'evt-cpu-01',
      podId: 'pod-telemetry-02',
      eventType: 'CPU Spike Infection',
      dangerScore: 91.5,
      severity: 'critical',
      infectionZone: 'zone-red-alpha',
      status: 'active',
      detectedBy: 'Dendritic-Agent-07',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: 'evt-mem-02',
      podId: 'pod-telemetry-02',
      eventType: 'Memory Leak Mutation',
      dangerScore: 84.7,
      severity: 'high',
      infectionZone: 'zone-red-beta',
      status: 'investigating',
      detectedBy: 'Dendritic-Agent-02',
      createdAt: new Date(Date.now() - 1000 * 60 * 35),
    },
    {
      id: 'evt-net-03',
      podId: 'pod-ctrl-05',
      eventType: 'SCADA Jitter Surge',
      dangerScore: 68.2,
      severity: 'medium',
      infectionZone: 'zone-yellow-gamma',
      status: 'resolved',
      detectedBy: 'TCell-Guardian-03',
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
  ],
  immuneAgents: [
    {
      id: 'agent-01',
      agentName: 'Dendritic-Agent-07',
      agentType: 'dendritic-cell',
      status: 'active',
      confidenceScore: 96.5,
      learningScore: 82.2,
      assignedZone: 'zone-red-alpha',
      activeTarget: 'telemetry-engine',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-02',
      agentName: 'TCell-Guardian-03',
      agentType: 't-cell',
      status: 'engaged',
      confidenceScore: 93.8,
      learningScore: 75.4,
      assignedZone: 'zone-red-alpha',
      activeTarget: 'CPU Spike Infection',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-03',
      agentName: 'BCell-Learner-09',
      agentType: 'b-cell',
      status: 'learning',
      confidenceScore: 88.1,
      learningScore: 97.3,
      assignedZone: 'memory-core',
      activeTarget: 'memory-pattern-analysis',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-04',
      agentName: 'NK-Cell-Striker-04',
      agentType: 'natural-killer',
      status: 'patrolling',
      confidenceScore: 91.0,
      learningScore: 78.5,
      assignedZone: 'perimeter-zone',
      activeTarget: 'threat-scanner',
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      id: 'agent-05',
      agentName: 'Macrophage-Purge-01',
      agentType: 'macrophage',
      status: 'standby',
      confidenceScore: 97.8,
      learningScore: 85.0,
      assignedZone: 'waste-reclamation',
      activeTarget: 'idle',
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
  ],
  memoryCells: [
    {
      id: 'mem-01',
      threatSignature: 'high-cpu-network-spike-pattern',
      vectorId: 'vec-001-bio-threat',
      mitigationStrategy: 'horizontal-pod-autoscaler-response',
      affinityScore: 94.8,
      successCount: 16,
      lastSeen: new Date(Date.now() - 1000 * 60 * 15),
      createdAt: new Date(Date.now() - 86400000 * 6),
    },
    {
      id: 'mem-02',
      threatSignature: 'memory-leak-persistent-growth',
      vectorId: 'vec-002-bio-threat',
      mitigationStrategy: 'restart-deployment-and-resource-reset',
      affinityScore: 88.5,
      successCount: 9,
      lastSeen: new Date(Date.now() - 1000 * 60 * 60),
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: 'mem-03',
      threatSignature: 'syn-flood-ingress-saturation',
      vectorId: 'vec-003-bio-threat',
      mitigationStrategy: 'rate-limit-and-bpf-drop',
      affinityScore: 92.1,
      successCount: 24,
      lastSeen: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 86400000 * 4),
    },
    {
      id: 'mem-04',
      threatSignature: 'thermal-surge-metabolic-overload',
      vectorId: 'vec-004-bio-threat',
      mitigationStrategy: 'load-shed-and-cooling-interlock',
      affinityScore: 97.0,
      successCount: 7,
      lastSeen: new Date(Date.now() - 1000 * 60 * 40),
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
  ],
  immuneResponses: [
    {
      id: 'resp-01',
      eventId: 'evt-cpu-01',
      responseType: 'pod-autoscale',
      actionTaken: 'Scaled telemetry-engine from 2 replicas to 5 replicas',
      successRate: 92.4,
      responseTimeMs: 284,
      triggeredBy: 'TCell-Guardian-03',
      responseStatus: 'completed',
      createdAt: new Date(Date.now() - 1000 * 60 * 14),
    },
    {
      id: 'resp-02',
      eventId: 'evt-net-03',
      responseType: 'memory-quarantine',
      actionTaken: 'Quarantined corrupted SCADA bus cache partitions on control-system-01',
      successRate: 96.8,
      responseTimeMs: 142,
      triggeredBy: 'BCell-Learner-09',
      responseStatus: 'completed',
      createdAt: new Date(Date.now() - 1000 * 60 * 115),
    },
    {
      id: 'resp-03',
      eventId: 'evt-mem-02',
      responseType: 'antibody-generation',
      actionTaken: 'Synthesized synthetic antibody ligand for vector vec-001',
      successRate: 98.2,
      responseTimeMs: 512,
      triggeredBy: 'Autonomous-Response-Core',
      responseStatus: 'completed',
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  ],
  auditLogs: [
    {
      id: 'log-01',
      actionType: 'ANTIBODY_DEPLOYED',
      actionDescription: 'Global antibody patch applied to sector node-alpha-01. All pathogen vectors purged.',
      performedBy: 'System Administrator',
      targetResource: 'node-alpha-01',
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: 'log-02',
      actionType: 'POLICY_ENFORCEMENT',
      actionDescription: 'Autonomic rate limiting engaged on ingress traffic. Threshold 85% CPU saturation.',
      performedBy: 'Dendritic-Agent-07',
      targetResource: 'telemetry-engine',
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 1000 * 60 * 18),
    },
    {
      id: 'log-03',
      actionType: 'NODE_REBOOT',
      actionDescription: 'Neural reboot cycle initiated and completed successfully for node-beta-02.',
      performedBy: 'System Administrator',
      targetResource: 'node-beta-02',
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 1000 * 60 * 65),
    },
  ],
  telemetry: [] as Array<{
    recordedAt: Date;
    cpuUsage: number;
    memoryUsage: number;
    networkIn: number;
    networkOut: number;
    signalType: string;
    podId: string;
  }>,
  settings: {
    autonomousPurge: true,
    heuristicLearning: true,
    aggressiveBalancing: false,
    criticalSensitivity: 85,
    metabolicWarning: 40,
  },
  datasetImports: [] as any[],
  historicalMetrics: [] as any[],
};

// Seed 30 recent telemetry ticks for time-series charts
const now = Date.now();
for (let i = 30; i >= 0; i--) {
  store.telemetry.push({
    recordedAt: new Date(now - i * 5000),
    cpuUsage: Math.round(40 + Math.sin(i * 0.4) * 20 + Math.random() * 10),
    memoryUsage: Math.round(55 + Math.cos(i * 0.3) * 15 + Math.random() * 5),
    networkIn: Math.round(150 + Math.random() * 300),
    networkOut: Math.round(80 + Math.random() * 180),
    signalType: 'heartbeat',
    podId: 'pod-telemetry-02',
  });
}

// ── App & HTTP / Socket.IO Setup ───────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ── Socket.io Connection & Events ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🧬 BioPods Neural Link Established: ${socket.id}`);

  socket.on('join_cluster', (clusterId) => {
    socket.join(`cluster:${clusterId}`);
    console.log(`Socket ${socket.id} joined cluster ${clusterId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🧬 Neural Link Severed: ${socket.id}`);
  });
});

// ── Autonomic T-Cell Reasoner & Threat Processor ───────────────────────────
function reasonAndMitigate(threat: {
  podId: string;
  type: string;
  metrics: { cpu?: number; memory?: number; temp?: number; network?: number };
}) {
  const isHigh = (threat.metrics.cpu || 0) > 85 || (threat.metrics.temp || 0) > 80;
  const severity = isHigh ? 'HIGH' : 'MEDIUM';

  let rootCause = 'Autonomic immune receptors detected anomalous metabolic variance.';
  let actionCommand = `bio-isolate --pod ${threat.podId} --quarantine-zone red`;
  let outcome = 'Pathogen contained. Replaced infected pod replicas with immunised clones.';

  if (threat.type.includes('THERMAL')) {
    rootCause = `Core temperature exceeded thermal barrier (${threat.metrics.temp || 92}°C). Cooling interlock trip imminent.`;
    actionCommand = `bio-throttle --pod ${threat.podId} --shed-workload 40% && bio-cool --boost-fans`;
    outcome = 'Metabolic load reduced by 40%. Temperature stabilised within 12 seconds.';
  } else if (threat.type.includes('DDOS')) {
    rootCause = `High volume packet flood detected (${threat.metrics.cpu || 98}% CPU saturation). Rate limiting breached.`;
    actionCommand = `bio-bpf-filter --pod ${threat.podId} --drop-syn --rate-limit 500rps`;
    outcome = 'Malicious SYN burst suppressed at ingress layer. Legitimate traffic preserved.';
  } else if (threat.type.includes('SQL') || threat.type.includes('INJECTION')) {
    rootCause = `Anomalous query entropy detected (${threat.metrics.memory || 96}% Memory spike). Heap corruption vector.`;
    actionCommand = `bio-sanitize --pod ${threat.podId} --flush-heap --rotate-credentials`;
    outcome = 'Tainted database connection pools recycled. Exploit vector neutralised.';
  }

  const analysis = {
    threat_severity: severity,
    root_cause_analysis: rootCause,
    action_command: actionCommand,
    expected_outcome: outcome,
  };

  // 1. Create DangerEvent
  const eventId = `evt-${Date.now().toString(36)}`;
  const dangerEvent = {
    id: eventId,
    podId: threat.podId,
    eventType: threat.type,
    dangerScore: severity === 'HIGH' ? 94.2 : 76.5,
    severity: severity.toLowerCase(),
    infectionZone: 'zone-red-injected',
    status: 'active',
    detectedBy: 'T-Cell Patrol Core',
    createdAt: new Date(),
  };
  store.dangerEvents.unshift(dangerEvent);

  // 2. Create ImmuneResponse
  const respId = `resp-${Date.now().toString(36)}`;
  const immuneResp = {
    id: respId,
    eventId,
    responseType: 't-cell-autonomic-mitigation',
    actionTaken: actionCommand,
    successRate: 98.4,
    responseTimeMs: Math.floor(180 + Math.random() * 220),
    triggeredBy: 'T-Cell Reasoner',
    responseStatus: 'completed',
    createdAt: new Date(),
    dangerEvent,
  };
  store.immuneResponses.unshift(immuneResp);

  // 3. Create AuditLog
  store.auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'THREAT_NEUTRALIZATION',
    actionDescription: `Autonomic T-Cell executed mitigation: ${actionCommand}. Outcome: ${outcome}`,
    performedBy: 'T-Cell Agent',
    targetResource: threat.podId,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  // 4. Update Pod Status
  const pod = store.pods.find((p) => p.podName === threat.podId || p.id === threat.podId);
  if (pod) {
    pod.dangerLevel = severity.toLowerCase();
    pod.podStatus = severity === 'HIGH' ? 'critical' : 'warning';
    pod.immunityState = 'infected';
    pod.cpuUsage = threat.metrics.cpu ?? pod.cpuUsage;
    pod.memoryUsage = threat.metrics.memory ?? pod.memoryUsage;
  }

  // 5. Broadcast to Socket.io
  io.emit('ai:reasoning', {
    podId: threat.podId,
    step: 'FORMULATING MITIGATION',
    content: JSON.stringify(analysis, null, 2),
    timestamp: new Date().toLocaleTimeString(),
  });

  io.emit('threat:detected', {
    podId: threat.podId,
    type: threat.type,
    label: severity,
    severity,
    details: rootCause,
    action: actionCommand,
    dbEventId: eventId,
    responseTimeMs: immuneResp.responseTimeMs,
    timestamp: new Date(),
  });

  io.emit('pod:danger:update', {
    podId: threat.podId,
    score: dangerEvent.dangerScore,
    label: severity,
    type: threat.type,
    details: rootCause,
  });

  io.emit('immune:response:started', {
    podId: threat.podId,
    actionType: actionCommand,
    eventId,
  });

  return { eventId, analysis, immuneResp };
}

// ── Background Routines ───────────────────────────────────────────────────
// 1. Metabolic Heartbeat: Organic pulses for UI maps
setInterval(() => {
  const podNames = store.pods.map((p) => p.podName);
  if (podNames.length > 1) {
    const source = podNames[Math.floor(Math.random() * podNames.length)];
    let target = podNames[Math.floor(Math.random() * podNames.length)];
    while (target === source) {
      target = podNames[Math.floor(Math.random() * podNames.length)];
    }
    io.emit('dependency:pulse', {
      source,
      target,
      latencyMs: Math.round(5 + Math.random() * 35),
      pulseSpeed: 'fast',
    });

    const agent = store.immuneAgents[Math.floor(Math.random() * store.immuneAgents.length)];
    io.emit('immune:agent:move', {
      agentName: agent.agentName,
      fromNode: source,
      toNode: target,
      speed: 'smooth-glide',
    });

    const grid = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        grid.push({ x, y, intensity: Math.round(Math.random() * 15) });
      }
    }
    io.emit('danger:heatmap', { grid, timestamp: new Date() });
  }
}, 3500);

// 2. Continuous Patrol Routine: Generates live stream telemetry
let patrolIdx = 0;
setInterval(() => {
  if (store.pods.length === 0) return;
  const pod = store.pods[patrolIdx % store.pods.length];
  patrolIdx++;

  const metrics = {
    cpu: Math.min(100, Math.max(10, Math.round((pod.cpuUsage || 30) + (Math.random() * 20 - 10)))),
    memory: Math.min(100, Math.max(15, Math.round((pod.memoryUsage || 45) + (Math.random() * 10 - 5)))),
    temp: Math.round(35 + Math.random() * 25),
    network: Math.round(100 + Math.random() * 400),
  };

  const sample = {
    recordedAt: new Date(),
    cpuUsage: metrics.cpu,
    memoryUsage: metrics.memory,
    networkIn: metrics.network,
    networkOut: Math.round(metrics.network * 0.6),
    signalType: 'heartbeat',
    podId: pod.id,
  };
  store.telemetry.push(sample);
  if (store.telemetry.length > 100) store.telemetry.shift();

  io.emit('telemetry:stream', {
    podId: pod.podName,
    clusterId: 'cluster-primary',
    metrics,
    timestamp: new Date(),
  });

  const healthyCount = store.nodes.filter((n) => n.nodeStatus === 'healthy').length;
  const healthPercent = Math.round((healthyCount / store.nodes.length) * 100);
  io.emit('cluster:health:update', {
    clusterId: 'cluster-primary',
    health: healthPercent,
  });
}, 5000);

// ── REST API ROUTES ───────────────────────────────────────────────────────
const authenticateToken = (req: any, _res: any, next: any) => {
  req.user = { id: store.user.id, role: store.user.role };
  next();
};

app.get('/health', (_req, res) => {
  res.json({ status: 'API Gateway Operational', database: 'CONNECTED', timestamp: new Date() });
});

// Auth Routes
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === store.user.email && password) {
    const accessToken = jwt.sign({ id: store.user.id, email: store.user.email, role: store.user.role }, JWT_SECRET, {
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ id: store.user.id, email: store.user.email, role: store.user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });
    return res.json({ accessToken, refreshToken, user: store.user });
  }
  return res.status(400).json({ error: 'Invalid credentials. Use admin@biopods.io / password' });
});

// Clusters
app.get('/api/v1/clusters', authenticateToken, (_req, res) => {
  const clusterWithRelations = {
    ...store.cluster,
    nodes: store.nodes.map((node) => ({
      ...node,
      pods: store.pods
        .filter((pod) => pod.nodeId === node.id)
        .map((pod) => ({
          ...pod,
          dangerEvents: store.dangerEvents.filter((d) => d.podId === pod.id),
        })),
    })),
    _count: {
      nodes: store.nodes.length,
      pods: store.pods.length,
    },
  };
  res.json([clusterWithRelations]);
});

app.get('/api/v1/clusters/:id', authenticateToken, (req, res) => {
  const cluster = {
    ...store.cluster,
    nodes: store.nodes.map((n) => ({
      ...n,
      pods: store.pods.filter((p) => p.nodeId === n.id),
    })),
  };
  res.json(cluster);
});

// Nodes
app.get('/api/v1/nodes', authenticateToken, (_req, res) => {
  res.json(store.nodes);
});

app.post('/api/v1/nodes/:id/reboot', authenticateToken, (req, res) => {
  const { id } = req.params;
  const node = store.nodes.find((n) => n.id === id || n.nodeName === id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  node.nodeStatus = 'rebooting';
  node.cpuUsage = 0.0;
  node.memoryUsage = 10.0;
  node.healthScore = 100.0;

  store.auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'NODE_REBOOT',
    actionDescription: `Initiated neural reboot cycle for sector/node ${node.nodeName}`,
    performedBy: 'System Administrator',
    targetResource: node.nodeName,
    status: 'PENDING',
    createdAt: new Date(),
  });

  setTimeout(() => {
    node.nodeStatus = 'healthy';
    node.cpuUsage = 28.4;
    node.memoryUsage = 38.2;
    node.healthScore = 98.6;

    store.auditLogs.unshift({
      id: `log-${Date.now().toString(36)}`,
      actionType: 'NODE_REBOOT_COMPLETE',
      actionDescription: `Neural reboot cycle complete. Sector ${node.nodeName} fully operational.`,
      performedBy: 'System Administrator',
      targetResource: node.nodeName,
      status: 'SUCCESS',
      createdAt: new Date(),
    });
  }, 8000);

  res.json({ status: 'REBOOT_INITIATED', node });
});

app.post('/api/v1/nodes/:id/mitigate', authenticateToken, (req, res) => {
  const { id } = req.params;
  const node = store.nodes.find((n) => n.id === id || n.nodeName === id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  node.nodeStatus = 'healthy';
  node.healthScore = 99.5;

  const nodePods = store.pods.filter((p) => p.nodeId === node.id);
  for (const pod of nodePods) {
    pod.podStatus = 'healthy';
    pod.dangerLevel = 'low';
    pod.immunityState = 'stable';
    for (const evt of store.dangerEvents.filter((e) => e.podId === pod.id)) {
      evt.status = 'resolved';
    }
  }

  store.auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'MITIGATION_DEPLOYED',
    actionDescription: `Deployed biological antibody patches to secure sector ${node.nodeName}. Purged all pathogen vectors.`,
    performedBy: 'System Administrator',
    targetResource: node.nodeName,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  res.json({ status: 'MITIGATION_COMPLETE', sectorName: node.nodeName });
});

// Topology Graph
app.get('/api/v1/topology/graph', authenticateToken, (_req, res) => {
  const nodes: any[] = [
    {
      id: 'ingress-core',
      label: 'INGRESS GATEWAY',
      type: 'ingress',
      status: 'healthy',
      details: 'External Application Load Balancer',
      cascadingRisk: 0,
    },
  ];
  const links: any[] = [];

  for (const p of store.pods) {
    let status: 'healthy' | 'warning' | 'danger' | 'critical' = 'healthy';
    if (p.podStatus === 'critical' || p.dangerLevel === 'critical') status = 'critical';
    else if (p.podStatus === 'infected' || p.dangerLevel === 'high') status = 'danger';
    else if (p.podStatus === 'unstable' || p.dangerLevel === 'medium') status = 'warning';

    nodes.push({
      id: p.id,
      label: p.podName.toUpperCase(),
      type: 'pod',
      status,
      cpu: p.cpuUsage || 20.0,
      memory: p.memoryUsage || 35.0,
      details: `Namespace: ${p.namespace || 'default'} | PVC Latency: ${p.pvcLatency || 2}ms`,
      cascadingRisk: status === 'critical' ? 85 : status === 'danger' ? 60 : 0,
    });
  }

  nodes.push({
    id: 'pvc-storage-ssd',
    label: 'METABOLIC DATASTORE PVC',
    type: 'pvc',
    status: 'healthy',
    details: 'SSD Dynamic Provisioner Block Storage',
    cascadingRisk: 0,
  });

  // Links
  links.push({
    id: 'link-ingress-auth',
    source: 'ingress-core',
    target: 'pod-auth-01',
    relation: 'routes-to',
    status: 'active',
    latencyMs: 14,
  });
  links.push({
    id: 'link-auth-telemetry',
    source: 'pod-auth-01',
    target: 'pod-telemetry-02',
    relation: 'gRPC-call',
    status: 'stressed',
    latencyMs: 42,
  });
  links.push({
    id: 'link-telemetry-scanner',
    source: 'pod-telemetry-02',
    target: 'pod-scanner-03',
    relation: 'gRPC-call',
    status: 'stressed',
    latencyMs: 28,
  });
  links.push({
    id: 'link-auth-ctrl',
    source: 'pod-auth-01',
    target: 'pod-ctrl-05',
    relation: 'gRPC-call',
    status: 'active',
    latencyMs: 18,
  });
  links.push({
    id: 'link-ctrl-turbine',
    source: 'pod-ctrl-05',
    target: 'pod-turbine-06',
    relation: 'scada-bus',
    status: 'active',
    latencyMs: 9,
  });
  links.push({
    id: 'link-ctrl-power',
    source: 'pod-ctrl-05',
    target: 'pod-power-04',
    relation: 'scada-bus',
    status: 'active',
    latencyMs: 12,
  });
  links.push({
    id: 'link-telemetry-pvc',
    source: 'pod-telemetry-02',
    target: 'pvc-storage-ssd',
    relation: 'pvc-mount',
    status: 'stressed',
    latencyMs: 38,
  });

  res.json({ nodes, links });
});

// Pods
app.get('/api/v1/pods', authenticateToken, (_req, res) => {
  const enriched = store.pods.map((p) => {
    const parentNode = store.nodes.find((n) => n.id === p.nodeId);
    return {
      ...p,
      node: parentNode ? { cpuUsage: parentNode.cpuUsage, memoryUsage: parentNode.memoryUsage, nodeName: parentNode.nodeName } : null,
    };
  });
  res.json(enriched);
});

// Anomalies / Danger Events
app.get('/api/v1/anomalies', authenticateToken, (_req, res) => {
  const enriched = store.dangerEvents.map((evt) => ({
    ...evt,
    pod: store.pods.find((p) => p.id === evt.podId) || { podName: evt.podId },
  }));
  res.json(enriched);
});

// Immune Agents
app.get('/api/v1/agents', authenticateToken, (_req, res) => {
  res.json(store.immuneAgents);
});

app.post('/api/v1/agents/:id/control', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const agent = store.immuneAgents.find((a) => a.id === id || a.agentName === id);
  if (agent) {
    if (action === 'engage') agent.status = 'engaged';
    else if (action === 'sleep') agent.status = 'standby';
    else if (action === 'boost') agent.confidenceScore = Math.min(100, (agent.confidenceScore || 90) + 5);
  }
  res.json({ status: 'SIGNAL_TRANSMITTED', agentId: id, action });
});

// Memory Cells
app.get('/api/v1/memory-cells', authenticateToken, (_req, res) => {
  res.json(store.memoryCells);
});

// Audit Logs
app.get('/api/v1/audit-logs', authenticateToken, (req, res) => {
  const limit = parseInt((req.query as any).limit) || 100;
  res.json(store.auditLogs.slice(0, Math.min(limit, 500)));
});

// Immune Responses
app.get('/api/v1/immune-responses', authenticateToken, (req, res) => {
  const limit = parseInt((req.query as any).limit) || 50;
  const responses = store.immuneResponses.slice(0, Math.min(limit, 200)).map((r) => ({
    ...r,
    dangerEvent: store.dangerEvents.find((e) => e.id === r.eventId),
  }));
  res.json(responses);
});

// Self-Heal Stats
app.get('/api/v1/self-heal/stats', authenticateToken, (_req, res) => {
  const total = store.immuneResponses.length;
  const completed = store.immuneResponses.filter((r) => r.responseStatus === 'completed').length;
  const avgRate = total > 0 ? store.immuneResponses.reduce((acc, r) => acc + (r.successRate || 95), 0) / total : 96.5;
  res.json({
    totalResponses: total,
    completedResponses: completed,
    memoryCells: store.memoryCells.length,
    avgSuccessRate: parseFloat(avgRate.toFixed(1)),
  });
});

// Action Execution
app.post('/api/v1/actions/execute', authenticateToken, (req, res) => {
  const { podId, actionType, eventId } = req.body;
  const triggeredBy = (req as any).user?.id || 'dashboard-user';

  const pod = store.pods.find((p) => p.id === podId || p.podName === podId);
  if (pod) {
    if (actionType.includes('isolate') || actionType.includes('purge') || actionType.includes('quarantine')) {
      pod.dangerLevel = 'low';
      pod.podStatus = 'healthy';
      pod.immunityState = 'protected';
    }
  }

  store.auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: actionType.toUpperCase(),
    actionDescription: `Action protocol [${actionType}] executed on resource ${podId}.`,
    performedBy: triggeredBy,
    targetResource: podId,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  io.emit('immune:response:started', { podId, actionType, eventId });
  io.emit('healing:animation', { podId, status: 'healed', animation: 'cytokine-flash' });

  res.json({ status: 'PROTOCOL_INITIATED', podId, actionType });
});

// Settings
app.get('/api/v1/settings', authenticateToken, (_req, res) => {
  res.json(store.settings);
});

app.post('/api/v1/settings', authenticateToken, (req, res) => {
  store.settings = { ...store.settings, ...req.body };
  res.json({ success: true, settings: store.settings });
});

// Global Antibody Deploy
app.post('/api/v1/antibody/deploy', authenticateToken, (req, res) => {
  const triggeredBy = (req as any).user?.id || 'dashboard-user';
  const results: any[] = [];

  for (const node of store.nodes) {
    node.nodeStatus = 'healthy';
    node.healthScore = 99.5;

    const nodePods = store.pods.filter((p) => p.nodeId === node.id);
    for (const pod of nodePods) {
      pod.podStatus = 'healthy';
      pod.dangerLevel = 'low';
      pod.immunityState = 'protected';
    }

    const immuneResp = {
      id: `resp-${Date.now().toString(36)}`,
      eventId: undefined,
      responseType: 'global-antibody-deploy',
      actionTaken: `Antibody patch deployed to ${node.nodeName}. ${nodePods.length} pods secured.`,
      successRate: parseFloat((97.5 + Math.random() * 2.5).toFixed(1)),
      responseTimeMs: Math.floor(600 + Math.random() * 400),
      triggeredBy,
      responseStatus: 'completed',
      createdAt: new Date(),
    };
    store.immuneResponses.unshift(immuneResp);

    store.auditLogs.unshift({
      id: `log-${Date.now().toString(36)}`,
      actionType: 'ANTIBODY_DEPLOYED',
      actionDescription: `Global antibody patch applied to sector ${node.nodeName}. Purged all pathogen vectors.`,
      performedBy: triggeredBy,
      targetResource: node.nodeName,
      status: 'SUCCESS',
      createdAt: new Date(),
    });

    results.push({
      nodeId: node.id,
      nodeName: node.nodeName,
      podsSecured: nodePods.length,
      immuneResponseId: immuneResp.id,
      status: 'SECURED',
    });
  }

  for (const evt of store.dangerEvents) {
    evt.status = 'resolved';
  }

  io.emit('antibody:deploy', {
    podId: 'all',
    antibodyType: 'GLOBAL_POLYVALENT_ANTIBODY',
    timestamp: new Date(),
  });

  res.json({
    status: 'ANTIBODY_DEPLOY_COMPLETE',
    nodesPatched: store.nodes.length,
    results,
  });
});

// Telemetry History
app.get('/api/v1/telemetry/history', authenticateToken, (_req, res) => {
  res.json({
    telemetry: store.telemetry,
    anomalies: store.dangerEvents.slice(0, 50),
  });
});

// Cluster Vitals
app.get('/api/v1/cluster/vitals', authenticateToken, (_req, res) => {
  const avgHealth = store.nodes.reduce((s, n) => s + (n.healthScore || 100), 0) / store.nodes.length;
  const avgCpu = store.nodes.reduce((s, n) => s + (n.cpuUsage || 0), 0) / store.nodes.length;
  const avgMem = store.nodes.reduce((s, n) => s + (n.memoryUsage || 0), 0) / store.nodes.length;
  const openThreats = store.dangerEvents.filter((e) => e.status !== 'resolved').length;

  res.json({
    immunityScore: Math.round(avgHealth),
    avgCpu: parseFloat(avgCpu.toFixed(1)),
    avgMemory: parseFloat(avgMem.toFixed(1)),
    totalNodes: store.nodes.length,
    totalPods: store.pods.length,
    openThreats,
    immuneResponses: store.immuneResponses.length,
    memoryCells: store.memoryCells.length,
  });
});

// Inject Telemetry (used by "INJECT THERMAL SURGE" etc. in Threat Detection)
app.post('/api/telemetry', (req, res) => {
  const { podId, metrics, type } = req.body;
  const isDangerous = (metrics.cpu || 0) > 80 || (metrics.memory || 0) > 85 || (metrics.temp || 0) > 70;

  if (isDangerous) {
    console.log(`[BioPods Threat Injection] Processing anomaly in pod: ${podId} (Type: ${type})`);
    reasonAndMitigate({ podId, type: type || 'Threshold Exceeded', metrics });
  }

  res.json({ status: 'ACK', podId });
});

// Cross-service Event Bridge
app.post('/api/events', (req, res) => {
  const { subject, data } = req.body;
  if (subject === 'system-threats') {
    reasonAndMitigate(data);
  }
  res.send('ok');
});

// Prometheus Metrics Route
app.get('/api/metrics', (_req, res) => {
  res.json({
    cpu: [{ metric: { instance: 'biopods-node-01' }, value: [Date.now() / 1000, '0.45'] }],
    memory: [{ metric: { instance: 'biopods-node-01' }, value: [Date.now() / 1000, '489291776'] }],
    network: [{ metric: { instance: 'biopods-node-01' }, value: [Date.now() / 1000, '142080'] }],
    podHealth: store.pods.map((p) => ({ metric: { pod: p.podName }, value: [Date.now() / 1000, p.podStatus === 'healthy' ? '1' : '0'] })),
  });
});

app.get('/api/metrics/live', (_req, res) => {
  res.json({
    cpu: Math.floor(Math.random() * 40) + 30,
    memory: Math.floor(Math.random() * 35) + 40,
    network: Math.floor(Math.random() * 400) + 150,
    podStatus: 'healthy',
  });
});

app.get('/api/metrics/history', (_req, res) => {
  res.json(store.telemetry);
});

app.get('/api/metrics/anomalies', (_req, res) => {
  res.json(store.dangerEvents);
});

// Dataset Routes
app.get('/api/dataset/imports', (_req, res) => res.json(store.datasetImports));
app.get('/api/dataset/history', (_req, res) => res.json({ data: store.historicalMetrics, total: store.historicalMetrics.length }));
app.get('/api/dataset/anomalies', (_req, res) => res.json(store.historicalMetrics.filter((m) => m.anomalyLabel)));
app.get('/api/dataset/trends', (_req, res) => res.json({ trends: [] }));
app.post('/api/dataset/upload', (_req, res) => {
  res.json({ success: true, rowsInserted: 120, duplicate: false });
});

// ── Frontend Vite Integration (Dev) / Static Serving (Prod) ────────────────
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
      root: path.resolve(__dirname, 'frontend'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🧬 BioPods Unified Core listening on port ${PORT} (0.0.0.0)`);
    console.log(`🌐 Neural Link and Autonomic Immune System active.`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
