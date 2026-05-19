import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ── Resolve path to the shared Prisma SQLite DB (same approach as db_persist.py) ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically import prisma from shared/db so we don't need a separate copy
let prisma: any;
async function getDb() {
  if (!prisma) {
    const mod = await import('../../shared/db/index.ts');
    prisma = mod.prisma;
    await prisma.$connect();
    console.log('✅ [Self-Heal] DB connected.');
  }
  return prisma;
}

// ── HTTP Bridge app (fallback when NATS is offline) ──
const app = express();
app.use(express.json());
const PORT = process.env.SELF_HEAL_PORT || 5100;

// ─────────────────────────────────────────────────────────────────────────────
// Core: execute a self-healing action and persist to DB
// ─────────────────────────────────────────────────────────────────────────────
async function executeHealingAction(payload: {
  podId: string;
  actionType: string;
  eventId?: string;
  triggeredBy?: string;
  params?: Record<string, any>;
}) {
  const db = await getDb();
  const { podId, actionType, eventId, triggeredBy = 'self-heal-engine', params = {} } = payload;
  const startTime = Date.now();

  console.log(`\n⚡ [Self-Heal] Executing: [${actionType}] → Pod: ${podId}`);

  // Simulate execution delay (real k8s would go here)
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

  const responseTimeMs = Date.now() - startTime;
  const successRate = 85 + Math.random() * 15; // 85–100%

  // 1. Persist ImmuneResponse ─────────────────────────────────────────────────
  const immuneResponse = await db.immuneResponse.create({
    data: {
      eventId: eventId || null,
      responseType: 'autonomous-self-heal',
      actionTaken: `${actionType} executed on pod ${podId}. ${params.details || ''}`.trim(),
      successRate,
      responseTimeMs,
      triggeredBy,
      responseStatus: 'completed',
    },
  });
  console.log(`[Self-Heal] ✅ ImmuneResponse saved: ${immuneResponse.id}`);

  // 2. Mark DangerEvent as resolved if we have one ───────────────────────────
  if (eventId) {
    try {
      await db.dangerEvent.update({
        where: { id: eventId },
        data: { status: 'resolved' },
      });
      console.log(`[Self-Heal] ✅ DangerEvent resolved: ${eventId}`);
    } catch (_) {
      // eventId may not exist if triggered manually
    }
  }

  // 3. Update Pod to healthy (or Quarantine if ISOLATE) ──────────────────────────
  try {
    if (actionType === 'ISOLATE') {
      let targetNodeName = 'node-beta-02';
      if (podId && podId !== 'sector-01' && podId !== 'all') {
        targetNodeName = podId;
      }

      const node = await db.node.findFirst({
        where: {
          OR: [
            { nodeName: targetNodeName },
            { id: targetNodeName },
          ],
        },
      });

      if (node) {
        await db.node.update({
          where: { id: node.id },
          data: {
            nodeStatus: 'isolated',
            healthScore: 40.0,
          },
        });
        console.log(`[Self-Heal] ✅ Node isolated in DB: ${node.nodeName}`);

        await db.pod.updateMany({
          where: { nodeId: node.id },
          data: {
            podStatus: 'quarantined',
            dangerLevel: 'medium',
            immunityState: 'isolated',
          },
        });
        console.log(`[Self-Heal] ✅ Pods on node ${node.nodeName} isolated in DB.`);
      }
    } else if (actionType === 'PURGE' || (podId === 'all' && actionType !== 'OPTIMIZE')) {
      // Purge all infected / unstable pods
      await db.pod.updateMany({
        where: { podStatus: { in: ['infected', 'unstable', 'critical'] } },
        data: {
          podStatus: 'quarantined',
          dangerLevel: 'medium',
          immunityState: 'isolated',
        },
      });
      // Resolve any active danger events in the database
      await db.dangerEvent.updateMany({
        where: { status: { not: 'resolved' } },
        data: { status: 'resolved' },
      });
      console.log(`[Self-Heal] ✅ Purged all unstable/infected pods in DB.`);
    } else if (actionType === 'OPTIMIZE') {
      // Optimize all pods to healthy status
      await db.pod.updateMany({
        data: {
          podStatus: 'healthy',
          dangerLevel: 'low',
          immunityState: 'protected',
        },
      });
      await db.node.updateMany({
        data: {
          nodeStatus: 'healthy',
          healthScore: 99.5,
        },
      });
      await db.dangerEvent.updateMany({
        where: { status: { not: 'resolved' } },
        data: { status: 'resolved' },
      });
      console.log(`[Self-Heal] ✅ Optimized metabolism for all pods/nodes in DB.`);
    } else {
      const pods = await db.pod.findMany({
        where: {
          OR: [
            { id: podId },
            { podName: { contains: podId } },
          ],
        },
        take: 1,
      });

      if (pods.length > 0) {
        await db.pod.update({
          where: { id: pods[0].id },
          data: {
            podStatus: 'healthy',
            dangerLevel: 'low',
            immunityState: 'recovered',
          },
        });
        console.log(`[Self-Heal] ✅ Pod status updated to healthy: ${pods[0].podName}`);

        // Resolve any open danger events on this pod
        await db.dangerEvent.updateMany({
          where: { podId: pods[0].id, status: { not: 'resolved' } },
          data: { status: 'resolved' },
        });
      }
    }
  } catch (err) {
    console.warn(`[Self-Heal] ⚠️  Pod update/isolation skipped: ${err}`);
  }

  // 4. Update MemoryCell — reinforce immune memory ───────────────────────────
  const threatSignature = actionType.toLowerCase().replace(/[^a-z0-9]/g, '-');
  try {
    const existing = await db.memoryCell.findFirst({
      where: { threatSignature },
    });

    if (existing) {
      await db.memoryCell.update({
        where: { id: existing.id },
        data: {
          successCount: (existing.successCount || 0) + 1,
          affinityScore: Math.min(99.9, (existing.affinityScore || 50) + 1.5),
          lastSeen: new Date(),
          mitigationStrategy: `${actionType} — success rate ${successRate.toFixed(1)}%`,
        },
      });
      console.log(`[Self-Heal] ✅ MemoryCell reinforced: ${existing.id}`);
    } else {
      await db.memoryCell.create({
        data: {
          threatSignature,
          vectorId: `vec-selfheal-${Date.now()}`,
          mitigationStrategy: `${actionType} — automated self-heal response`,
          affinityScore: 60.0,
          successCount: 1,
          lastSeen: new Date(),
        },
      });
      console.log(`[Self-Heal] ✅ MemoryCell created for: ${threatSignature}`);
    }
  } catch (err) {
    console.warn(`[Self-Heal] ⚠️  MemoryCell upsert failed: ${err}`);
  }

  // 5. Write AuditLog ────────────────────────────────────────────────────────
  const actionDesc = actionType === 'ISOLATE'
    ? `Sector isolation engaged. Sector node-beta-02 placed in metabolic quarantine. Outbound neural connections severed.`
    : `Self-healing engine executed [${actionType}] on pod ${podId}. Response time: ${responseTimeMs}ms. Success rate: ${successRate.toFixed(1)}%.`;

  await db.auditLog.create({
    data: {
      actionType: `SELF_HEAL_${actionType.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
      actionDescription: actionDesc,
      performedBy: triggeredBy,
      targetResource: podId,
      status: 'SUCCESS',
    },
  });
  console.log(`[Self-Heal] ✅ AuditLog written`);

  return {
    podId,
    actionType,
    status: 'SUCCESS',
    responseTimeMs,
    successRate,
    immuneResponseId: immuneResponse.id,
    timestamp: new Date(),
    details: actionType === 'ISOLATE' 
      ? `Sector node-beta-02 isolated and quarantined.` 
      : `Self-healing agent successfully neutralized threat via ${actionType}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Endpoints (used when NATS is offline — the normal demo scenario)
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'SELF_HEAL_ACTIVE', timestamp: new Date() });
});

// Main action trigger (called by api-gateway or frontend)
app.post('/actions/execute', async (req, res) => {
  try {
    const { podId, actionType, eventId, triggeredBy, params } = req.body;

    if (!podId || !actionType) {
      return res.status(400).json({ error: 'podId and actionType are required.' });
    }

    // Execute asynchronously so response is instant, healing runs in background
    res.json({
      status: 'PROTOCOL_INITIATED',
      podId,
      actionType,
      message: 'Self-healing sequence initiated. Results will be persisted to DB.',
    });

    // Run in background
    executeHealingAction({ podId, actionType, eventId, triggeredBy, params })
      .then(result => console.log(`[Self-Heal] Action complete:`, result))
      .catch(err => console.error(`[Self-Heal] Action failed:`, err));

  } catch (error) {
    console.error('[Self-Heal] Execute error:', error);
    res.status(500).json({ error: 'Self-heal execution failed.' });
  }
});

// Get recent immune responses from DB
app.get('/immune-responses', async (_req, res) => {
  try {
    const db = await getDb();
    const responses = await db.immuneResponse.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { dangerEvent: true },
    });
    res.json({ success: true, data: responses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch immune responses.' });
  }
});

// Get recent audit logs from DB
app.get('/audit-logs', async (_req, res) => {
  try {
    const db = await getDb();
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Get healing stats
app.get('/stats', async (_req, res) => {
  try {
    const db = await getDb();
    const [totalResponses, completedResponses, memoryCells, recentAudit] = await Promise.all([
      db.immuneResponse.count(),
      db.immuneResponse.count({ where: { responseStatus: 'completed' } }),
      db.memoryCell.count(),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const avgSuccessRate = await db.immuneResponse.aggregate({
      _avg: { successRate: true },
    });

    res.json({
      success: true,
      data: {
        totalResponses,
        completedResponses,
        memoryCells,
        avgSuccessRate: avgSuccessRate._avg.successRate || 0,
        recentAudit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NATS subscriber (best-effort — if NATS is available)
// ─────────────────────────────────────────────────────────────────────────────
async function tryConnectNats() {
  try {
    const { natsClient } = await import('../../shared/messaging/index.ts');
    await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
    console.log('📡 [Self-Heal] NATS connected — listening on action.execute');

    natsClient.subscribe('action.execute', async (data: any) => {
      const { podId, actionType, eventId, params } = data;
      const result = await executeHealingAction({ podId, actionType, eventId, params });
      natsClient.publish('visualization.update', { type: 'actionExecuted', data: result });
    });
  } catch {
    console.warn('⚠️  [Self-Heal] NATS unavailable — operating in HTTP bridge mode only.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const startSelfHealing = async () => {
  await getDb(); // warm up DB connection
  tryConnectNats(); // non-blocking NATS attempt

  app.listen(PORT, () => {
    console.log(`🧬 [Self-Heal] Engine running on port ${PORT}`);
    console.log(`   → POST /actions/execute  — trigger healing action`);
    console.log(`   → GET  /immune-responses — fetch DB responses`);
    console.log(`   → GET  /audit-logs       — fetch DB audit trail`);
    console.log(`   → GET  /stats            — healing statistics`);
  });
};

startSelfHealing().catch(console.error);
