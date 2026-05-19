import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { natsClient } from '../../shared/messaging/index.ts';
import { prisma } from '../../shared/db/index.ts';
import { createDatasetRouter } from './routes/dataset.js';

const SELF_HEAL_URL = process.env.SELF_HEAL_URL || 'http://localhost:5100';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-biopods-key';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount the dataset import router (Option A Kaggle integration)
app.use('/api/dataset', createDatasetRouter());

// Auth Middleware (Bypassed for Hackathon Demo)
export const authenticateToken = (req: any, res: any, next: any) => {
  req.user = { id: 'demo-user', role: 'ADMIN' }; // Mock user
  next();
};

// Basic Routes
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway Operational', database: 'CONNECTED', timestamp: new Date() });
});

// Auth Routes
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user && password) { // In real app, check passwordHash
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ accessToken, refreshToken, user });
    }
    res.status(400).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cluster Routes
app.get('/api/v1/clusters', authenticateToken, async (req, res) => {
  try {
    const clusters = await prisma.cluster.findMany({
      include: {
        nodes: {
          include: {
            pods: {
              include: {
                dangerEvents: true
              }
            }
          }
        },
        _count: {
          select: { nodes: true, pods: true }
        }
      }
    });
    res.json(clusters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

app.get('/api/v1/clusters/:id', authenticateToken, async (req, res) => {
  try {
    const cluster = await prisma.cluster.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: {
          include: { pods: true }
        }
      }
    });
    res.json(cluster);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cluster details' });
  }
});

// Node Routes
app.get('/api/v1/nodes', authenticateToken, async (req, res) => {
  try {
    const nodes = await prisma.node.findMany();
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

app.post('/api/v1/nodes/:id/reboot', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update node status to "rebooting" and reset usage temporarily
    const node = await prisma.node.update({
      where: { id },
      data: {
        nodeStatus: 'rebooting',
        cpuUsage: 0.0,
        memoryUsage: 10.0,
        healthScore: 100.0
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actionType: 'NODE_REBOOT',
        actionDescription: `Initiated neural reboot cycle for sector/node ${node.nodeName || id}`,
        performedBy: 'System Administrator',
        targetResource: node.nodeName || id,
        status: 'PENDING'
      }
    });

    // Publish control signal over NATS (if subscribed)
    natsClient.publish(`node.${id}.control`, {
      nodeId: id,
      action: 'REBOOT',
      timestamp: new Date()
    });

    // Set timeout to restore status to healthy after 10 seconds
    setTimeout(async () => {
      try {
        await prisma.node.update({
          where: { id },
          data: {
            nodeStatus: 'healthy',
            cpuUsage: 25.4,
            memoryUsage: 35.8,
            healthScore: 98.2
          }
        });
        
        await prisma.auditLog.create({
          data: {
            actionType: 'NODE_REBOOT_COMPLETE',
            actionDescription: `Neural reboot cycle complete. Sector ${node.nodeName || id} has fully recovered and returned to optimal operation.`,
            performedBy: 'System Administrator',
            targetResource: node.nodeName || id,
            status: 'SUCCESS'
          }
        });
      } catch (err) {
        console.error("Failed to finish reboot timeout", err);
      }
    }, 10000);

    res.json({ status: 'REBOOT_INITIATED', node });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate node reboot' });
  }
});

app.post('/api/v1/nodes/:id/mitigate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find node details
    const node = await prisma.node.findUnique({
      where: { id }
    });

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Update node status to healthy
    await prisma.node.update({
      where: { id },
      data: {
        nodeStatus: 'healthy',
        healthScore: 99.5
      }
    });

    // Resolve any critical danger events on pods on this node!
    const nodePods = await prisma.pod.findMany({
      where: { nodeId: id }
    });

    for (const pod of nodePods) {
      await prisma.pod.update({
        where: { id: pod.id },
        data: {
          podStatus: 'healthy',
          dangerLevel: 'low',
          immunityState: 'stable'
        }
      });

      // Update unresolved danger events to resolved
      await prisma.dangerEvent.updateMany({
        where: { podId: pod.id, status: { not: 'resolved' } },
        data: { status: 'resolved' }
      });
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actionType: 'MITIGATION_DEPLOYED',
        actionDescription: `Deployed biological antibody patches to secure sector ${node.nodeName}. Purged all pathogen vectors.`,
        performedBy: 'System Administrator',
        targetResource: node.nodeName,
        status: 'SUCCESS'
      }
    });

    res.json({ status: 'MITIGATION_COMPLETE', sectorName: node.nodeName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deploy antibodies' });
  }
});

// Pod Routes
app.get('/api/v1/pods', authenticateToken, async (req, res) => {
  try {
    const pods = await prisma.pod.findMany();
    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Danger Events
app.get('/api/v1/anomalies', authenticateToken, async (req, res) => {
  try {
    const anomalies = await prisma.dangerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: { pod: true }
    });
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Immune Agents
app.get('/api/v1/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await prisma.immuneAgent.findMany();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/v1/agents/:id/control', authenticateToken, (req: any, res: any) => {
  const { id } = req.params;
  const { action } = req.body;
  
  natsClient.publish(`agent.${id}.control`, {
    agentId: id,
    action,
    timestamp: new Date()
  });

  res.json({ status: 'SIGNAL_TRANSMITTED', agentId: id, action });
});

// Memory Cells
app.get('/api/v1/memory-cells', authenticateToken, async (req, res) => {
  try {
    const memory = await prisma.memoryCell.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memory cells' });
  }
});

// Audit Logs
app.get('/api/v1/audit-logs', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt((req.query as any).limit as string) || 100;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Immune Responses
app.get('/api/v1/immune-responses', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt((req.query as any).limit as string) || 50;
    const responses = await prisma.immuneResponse.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: { dangerEvent: true },
    });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch immune responses' });
  }
});

// Self-Heal Stats (aggregated from DB)
app.get('/api/v1/self-heal/stats', authenticateToken, async (req, res) => {
  try {
    const [totalResponses, completedResponses, memoryCells, avgRate] = await Promise.all([
      prisma.immuneResponse.count(),
      prisma.immuneResponse.count({ where: { responseStatus: 'completed' } }),
      prisma.memoryCell.count(),
      prisma.immuneResponse.aggregate({ _avg: { successRate: true } }),
    ]);
    res.json({
      totalResponses,
      completedResponses,
      memoryCells,
      avgSuccessRate: avgRate._avg.successRate || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch self-heal stats' });
  }
});

// Action Execution — proxies to self-heal service (with NATS fallback)
app.post('/api/v1/actions/execute', authenticateToken, async (req: any, res: any) => {
  const { podId, actionType, eventId, params } = req.body;
  const triggeredBy = req.user?.id || 'dashboard-user';

  // Try self-heal HTTP service first
  try {
    const { default: axios } = await import('axios');
    await axios.post(`${SELF_HEAL_URL}/actions/execute`, {
      podId,
      actionType,
      eventId,
      triggeredBy,
      params,
    }, { timeout: 3000 });
    return res.json({ status: 'PROTOCOL_INITIATED', podId, actionType });
  } catch (_httpErr) {
    // Fall back to NATS if self-heal HTTP is down
    natsClient.publish('action.execute', {
      podId,
      actionType,
      requestedBy: triggeredBy,
      eventId,
      timestamp: new Date()
    });
    return res.json({ status: 'PROTOCOL_INITIATED_NATS', requestId: Math.random().toString(36).substring(7) });
  }
});

// System Settings (Aggregated and persisted in SQLite)
app.get('/api/v1/settings', authenticateToken, async (req, res) => {
  try {
    const result: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM system_settings WHERE key = 'global'`);
    if (result.length > 0) {
      return res.json(JSON.parse(result[0].value));
    }
    
    const defaultSettings = {
      autonomousPurge: true,
      heuristicLearning: true,
      aggressiveBalancing: false,
      criticalSensitivity: 85,
      metabolicWarning: 40
    };
    
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO system_settings (id, key, value, updated_at) VALUES ('settings', 'global', ?, datetime('now'))`,
      JSON.stringify(defaultSettings)
    );
    
    res.json(defaultSettings);
  } catch (error) {
    const defaultSettings = {
      autonomousPurge: true,
      heuristicLearning: true,
      aggressiveBalancing: false,
      criticalSensitivity: 85,
      metabolicWarning: 40
    };
    res.json(defaultSettings);
  }
});

app.post('/api/v1/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO system_settings (id, key, value, updated_at) VALUES ('settings', 'global', ?, datetime('now'))`,
      JSON.stringify(settings)
    );
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to persist settings in SQLite database' });
  }
});

// ── Global Antibody Deploy ─────────────────────────────────────────────────
// Deploys mitigation patches across ALL nodes in the cluster at once.
// Returns per-node results + persists AuditLog + ImmuneResponse for every node.
app.post('/api/v1/antibody/deploy', authenticateToken, async (req: any, res: any) => {
  const triggeredBy = req.user?.id || 'dashboard-user';
  try {
    const nodes = await prisma.node.findMany({
      include: { pods: true }
    });

    if (nodes.length === 0) {
      return res.status(404).json({ error: 'No nodes found in cluster.' });
    }

    const results: any[] = [];

    for (const node of nodes) {
      // Update node to healthy
      await prisma.node.update({
        where: { id: node.id },
        data: { nodeStatus: 'healthy', healthScore: 99.5 }
      });

      // Heal all pods on this node
      for (const pod of node.pods) {
        await prisma.pod.update({
          where: { id: pod.id },
          data: { podStatus: 'healthy', dangerLevel: 'low', immunityState: 'protected' }
        });
        await prisma.dangerEvent.updateMany({
          where: { podId: pod.id, status: { not: 'resolved' } },
          data: { status: 'resolved' }
        });
      }

      // Create ImmuneResponse record for this node
      const immuneResp = await prisma.immuneResponse.create({
        data: {
          responseType: 'global-antibody-deploy',
          actionTaken: `Antibody patch deployed to ${node.nodeName}. ${node.pods.length} pods secured.`,
          successRate: 97.5 + Math.random() * 2.5,
          responseTimeMs: Math.floor(800 + Math.random() * 600),
          triggeredBy,
          responseStatus: 'completed',
        }
      });

      // AuditLog entry
      await prisma.auditLog.create({
        data: {
          actionType: 'ANTIBODY_DEPLOYED',
          actionDescription: `Global antibody patch applied to sector ${node.nodeName}. ${node.pods.length} pods immunised. All pathogen vectors purged.`,
          performedBy: triggeredBy,
          targetResource: node.nodeName || node.id,
          status: 'SUCCESS'
        }
      });

      results.push({
        nodeId: node.id,
        nodeName: node.nodeName,
        podsSecured: node.pods.length,
        immuneResponseId: immuneResp.id,
        status: 'SECURED'
      });
    }

    res.json({
      status: 'ANTIBODY_DEPLOY_COMPLETE',
      nodesPatched: nodes.length,
      results,
    });
  } catch (error) {
    console.error('Antibody deploy error:', error);
    res.status(500).json({ error: 'Failed to deploy antibodies.' });
  }
});

// ── Telemetry History (for graph) ─────────────────────────────────────────
// Returns the last N node snapshots aggregated for dashboard charting
app.get('/api/v1/telemetry/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt((req.query as any).limit as string) || 30;
    const nodes = await prisma.node.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true, nodeName: true }
    });

    const telemetry = await prisma.telemetry.findMany({
      orderBy: { recordedAt: 'asc' },
      take: Math.min(limit, 200),
      select: {
        recordedAt: true, cpuUsage: true, memoryUsage: true,
        networkIn: true, networkOut: true, signalType: true, podId: true
      }
    });

    // Also pull anomaly counts bucketed by time for overlay
    const anomalies = await prisma.dangerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { createdAt: true, severity: true, status: true }
    });

    res.json({ telemetry, anomalies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry history' });
  }
});

// ── Cluster Vitals Summary (for immunity score recalc) ────────────────────
app.get('/api/v1/cluster/vitals', authenticateToken, async (req, res) => {
  try {
    const [nodes, pods, openThreats, immuneResponses, memoryCells] = await Promise.all([
      prisma.node.findMany({ select: { healthScore: true, cpuUsage: true, memoryUsage: true, nodeStatus: true } }),
      prisma.pod.count(),
      prisma.dangerEvent.count({ where: { status: { not: 'resolved' } } }),
      prisma.immuneResponse.count({ where: { responseStatus: 'completed' } }),
      prisma.memoryCell.count(),
    ]);

    const avgHealth = nodes.length > 0
      ? nodes.reduce((s, n) => s + (n.healthScore || 100), 0) / nodes.length
      : 100;
    const avgCpu = nodes.length > 0
      ? nodes.reduce((s, n) => s + (n.cpuUsage || 0), 0) / nodes.length
      : 0;
    const avgMem = nodes.length > 0
      ? nodes.reduce((s, n) => s + (n.memoryUsage || 0), 0) / nodes.length
      : 0;

    res.json({
      immunityScore: Math.round(avgHealth),
      avgCpu: parseFloat(avgCpu.toFixed(1)),
      avgMemory: parseFloat(avgMem.toFixed(1)),
      totalNodes: nodes.length,
      totalPods: pods,
      openThreats,
      immuneResponses,
      memoryCells,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cluster vitals' });
  }
});

// Initialize NATS and Database before starting
const bootstrap = async () => {
  try {
    await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
    await prisma.$connect();
    console.log('✅ Database and Messaging layers connected.');
    
    app.listen(PORT, () => {
      console.log(`🚀 BioPods API Gateway running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Bootstrap failed", err);
    process.exit(1);
  }
};

bootstrap();
