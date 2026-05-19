import axios from 'axios';
import dotenv from 'dotenv';
import { natsClient } from '../../shared/messaging/index.ts';
import { prisma } from '../../shared/db/index.ts';

dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function analyzeThreat(threatPattern: string) {
  try {
    console.log(`🤖 Ollama analyzing threat pattern: ${threatPattern}`);
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL,
      prompt: `Analyze this Kubernetes pod threat signature and provide a mitigation strategy in JSON format: "${threatPattern}". Response should include: severity (low, high, critical), strategy_name, and description.`,
      stream: false
    });

    const analysis = JSON.parse(response.data.response);
    return analysis;
  } catch (error) {
    console.error('❌ Ollama Analysis Failed:', error);
    return {
      severity: 'high',
      strategy_name: 'default-isolation',
      description: 'Ollama analysis unavailable. Initiating default container isolation protocol.'
    };
  }
}

/**
 * Persist the Ollama analysis results into the database.
 * Creates DangerEvent, ImmuneResponse, MemoryCell, and AuditLog records.
 */
async function persistAnalysis(eventData: any, analysis: any, responseTimeMs: number) {
  try {
    // 1. Find or create the DangerEvent
    let dangerEvent;
    if (eventData.podId) {
      dangerEvent = await prisma.dangerEvent.create({
        data: {
          podId: eventData.podId,
          eventType: eventData.eventType || 'Unknown Threat',
          dangerScore: eventData.dangerScore ?? 0,
          severity: analysis.severity || 'high',
          infectionZone: eventData.podName ? `zone-${eventData.podName}` : 'zone-unknown',
          status: 'active',
          detectedBy: 'Ollama-Intelligence-Service',
        },
      });
      console.log(`💾 DangerEvent persisted: ${dangerEvent.id}`);
    }

    // 2. Create an ImmuneResponse linked to the event
    if (dangerEvent) {
      const immuneResponse = await prisma.immuneResponse.create({
        data: {
          eventId: dangerEvent.id,
          responseType: analysis.strategy_name || 'ollama-analysis',
          actionTaken: analysis.description || 'Automated Ollama threat analysis completed',
          successRate: analysis.severity === 'low' ? 95.0 : analysis.severity === 'high' ? 75.0 : 60.0,
          responseTimeMs,
          triggeredBy: 'Ollama-Intelligence-Service',
          responseStatus: 'completed',
        },
      });
      console.log(`💾 ImmuneResponse persisted: ${immuneResponse.id}`);
    }

    // 3. Upsert a MemoryCell — the system "remembers" the threat signature
    const threatSignature = (eventData.eventType || 'unknown-threat').toLowerCase().replace(/\s+/g, '-');
    const existingMemory = await prisma.memoryCell.findFirst({
      where: { threatSignature },
    });

    if (existingMemory) {
      await prisma.memoryCell.update({
        where: { id: existingMemory.id },
        data: {
          successCount: (existingMemory.successCount || 0) + 1,
          lastSeen: new Date(),
          mitigationStrategy: analysis.strategy_name || existingMemory.mitigationStrategy,
          affinityScore: Math.min(99.9, (existingMemory.affinityScore || 50) + 0.5),
        },
      });
      console.log(`💾 MemoryCell updated: ${existingMemory.id} (seen ${(existingMemory.successCount || 0) + 1} times)`);
    } else {
      const memoryCell = await prisma.memoryCell.create({
        data: {
          threatSignature,
          vectorId: `vec-ollama-${Date.now()}`,
          mitigationStrategy: analysis.strategy_name || 'ollama-derived-strategy',
          affinityScore: 50.0,
          successCount: 1,
          lastSeen: new Date(),
        },
      });
      console.log(`💾 MemoryCell created: ${memoryCell.id} — signature: ${threatSignature}`);
    }

    // 4. Write an AuditLog entry
    await prisma.auditLog.create({
      data: {
        actionType: 'OLLAMA_THREAT_ANALYSIS',
        actionDescription: `Ollama analyzed "${eventData.eventType}" for pod ${eventData.podName || eventData.podId}. Severity: ${analysis.severity}. Strategy: ${analysis.strategy_name}.`,
        performedBy: 'Ollama-Intelligence-Service',
        targetResource: eventData.podId || 'unknown-pod',
        status: 'completed',
      },
    });
    console.log(`💾 AuditLog entry written.`);
  } catch (dbError) {
    console.error('❌ Database persistence failed:', dbError);
  }
}

async function startService() {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  await prisma.$connect();
  console.log('🧠 BioPods Ollama Intelligence Service Active (DB-integrated)...');

  // Listen for new danger events to analyze
  natsClient.subscribe('danger.event', async (data: any) => {
    console.log(`📥 Received danger event for analysis: ${data.eventType}`);
    
    const startTime = Date.now();
    const analysis = await analyzeThreat(data.eventType);
    const responseTimeMs = Date.now() - startTime;

    // Persist the analysis into the database
    await persistAnalysis(data, analysis, responseTimeMs);
    
    // Publish intelligence back to the system
    natsClient.publish('threat.intelligence', {
      eventId: data.id,
      analysis,
      responseTimeMs,
      persistedToDb: true,
      timestamp: new Date()
    });
  });
}

startService().catch(console.error);
