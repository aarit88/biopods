import { prisma, DangerEvent } from '../../../shared/db/index.ts';
import { natsClient } from '../../../shared/messaging/index.ts';
import { DetectorEngine } from '../../../shared/algorithms/negative-selection.ts';
import { ClonalSelectionEngine } from '../../../shared/algorithms/clonal-selection.ts';
import { MemoryCellService } from '../../../shared/db/memory-vector.ts';
import axios from 'axios';

const SELF_HEAL_URL = process.env.SELF_HEAL_URL || 'http://localhost:5100';

export interface ThreatTicket {
  podId: string;
  podName: string;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONFLICT PREVENTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export class ConflictPreventionEngine {
  private static activeHealingTargets: Set<string> = new Set();

  static acquireLock(podId: string): boolean {
    if (this.activeHealingTargets.has(podId)) {
      console.log(`🔒 [Conflict Prevention] Blocked overlapping action on active healing target: ${podId}`);
      return false;
    }
    this.activeHealingTargets.add(podId);
    return true;
  }

  static releaseLock(podId: string) {
    this.activeHealingTargets.delete(podId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRIORITY RESOLVER
// ─────────────────────────────────────────────────────────────────────────────
export class PriorityResolver {
  private static SEVERITY_WEIGHTS = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  /**
   * Sorts threat tickets in place based on biological risk priority.
   */
  static prioritize(tickets: ThreatTicket[]): ThreatTicket[] {
    return tickets.sort((a, b) => {
      const wA = this.SEVERITY_WEIGHTS[a.severity] || 0;
      const wB = this.SEVERITY_WEIGHTS[b.severity] || 0;
      
      if (wA !== wB) return wB - wA; // Higher severity first
      return b.score - a.score; // Higher score breaks ties
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RESPONSE COORDINATOR
// ─────────────────────────────────────────────────────────────────────────────
export class ResponseCoordinator {
  /**
   * Dispatches the healing command to the Self-Healing engine and monitors the outcome.
   */
  static async dispatchRemediation(podId: string, actionType: string, eventId?: string): Promise<boolean> {
    try {
      console.log(`🚀 [Response Coordinator] Dispatching autonomous [${actionType}] action on pod ${podId}`);
      
      const response = await axios.post(`${SELF_HEAL_URL}/actions/execute`, {
        podId,
        actionType,
        eventId,
        triggeredBy: 'Immune-Orchestrator'
      }, { timeout: 3000 });

      const success = response.data && response.data.status === 'PROTOCOL_INITIATED';
      
      // Publish event via NATS
      natsClient.publish('action.execute', {
        podId,
        actionType,
        eventId,
        requestedBy: 'Immune-Orchestrator',
        timestamp: new Date()
      });

      return success;
    } catch (e: any) {
      console.warn(`⚠️ [Response Coordinator] Direct HTTP dispatch failed (${e.message}). Falling back to NATS broadcast.`);
      
      // Fallback NATS publication
      natsClient.publish('action.execute', {
        podId,
        actionType,
        eventId,
        requestedBy: 'Immune-Orchestrator',
        timestamp: new Date()
      });
      
      return true; 
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN IMMUNE RESPONSE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
export class ImmuneOrchestrator {
  private static threatQueue: ThreatTicket[] = [];
  private static processingQueue = false;

  static async startOrchestration() {
    console.log('🧬 [Immune Orchestrator] Central Nervous System online. Subscribing to danger pathways...');

    // Subscribe to Dendritic danger outputs
    natsClient.subscribe('danger.score', async (dangerEvent: any) => {
      await this.ingestDangerSignal(dangerEvent);
    });
  }

  /**
   * Receives signals from the Dendritic Cell Algorithm and maps them to negative selection.
   */
  private static async ingestDangerSignal(event: any) {
    const podId = event.podId;
    const podName = event.podName || podId;
    const score = event.score || 0;
    const label = event.label || 'SAFE';
    
    if (label === 'SAFE') return; // Safe, no threat reaction required

    // 1. Double check against Negative Selection Detector Engine
    const metricsSummary = event.metricsSummary || { cpu: 50, memory: 50, pvcLatency: 5 };
    const analysis = DetectorEngine.detect({
      cpu: metricsSummary.cpu,
      memory: metricsSummary.memory,
      diskIo: 10,
      networkIn: 50,
      networkOut: 50,
      pvcLatency: metricsSummary.pvcLatency
    });

    if (!analysis.isAnomaly && label !== 'CRITICAL') {
      console.log(`🛡️ [Negative Selection] Signal on ${podName} filtered as safe self-reactive noise. Apoptosis triggered.`);
      return;
    }

    const ticket: ThreatTicket = {
      podId,
      podName,
      threatType: event.triggeringSignals?.[0] || 'Metabolic Strain Anomaly',
      severity: label.toLowerCase() as any,
      score,
      timestamp: new Date()
    };

    console.log(`📥 [Orchestrator] Queued threat ticket: [${ticket.threatType}] on ${podName} (Severity: ${ticket.severity.toUpperCase()})`);
    this.threatQueue.push(ticket);
    
    // Process queue asynchronously
    this.triggerQueueProcessing();
  }

  private static async triggerQueueProcessing() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    try {
      while (this.threatQueue.length > 0) {
        // Sort queue by risk weight priority
        PriorityResolver.prioritize(this.threatQueue);
        const nextTicket = this.threatQueue.shift()!;

        // Acquire lock to prevent concurrent remediation conflicts
        if (!ConflictPreventionEngine.acquireLock(nextTicket.podId)) {
          // Re-queue ticket for later try
          this.threatQueue.push(nextTicket);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        try {
          await this.orchestrateResponse(nextTicket);
        } catch (err: any) {
          console.error(`❌ Response orchestration failed for ${nextTicket.podName}:`, err.message);
        } finally {
          ConflictPreventionEngine.releaseLock(nextTicket.podId);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Resolves the threat by searching Memory Cells, evolving antibodies, executing action, and reinforcing B-cells.
   */
  private static async orchestrateResponse(ticket: ThreatTicket) {
    console.log(`\n🔍 [Orchestrator] Orchestrating response for: ${ticket.podName} -> ${ticket.threatType}`);

    // Create DangerEvent record in Database
    let dbEvent: DangerEvent | undefined;
    try {
      dbEvent = await prisma.dangerEvent.create({
        data: {
          podId: ticket.podId,
          eventType: ticket.threatType,
          dangerScore: ticket.score,
          severity: ticket.severity.toUpperCase(),
          infectionZone: `zone-${ticket.podName}`,
          status: 'active',
          detectedBy: 'Dendritic-Signal-Fusion'
        }
      });
    } catch (_) {}

    // 1. Query ChromaDB Vector Memory System
    console.log(`🧠 [Orchestrator] Querying ChromaDB Vector Memory for past encounters...`);
    const memories = await MemoryCellService.queryMemory(ticket.threatType, 1);
    
    let healingAction = 'RESTART'; // default safety net
    let confidence = 50.0;

    if (memories.length > 0 && memories[0].affinityScore > 65.0) {
      // Memory Recall Successful! Use previously evolved high-affinity mitigation
      const recalled = memories[0];
      healingAction = recalled.mitigationStrategy.includes('SCALE') ? 'SCALE' : 
                      recalled.mitigationStrategy.includes('ISOLATE') ? 'ISOLATE' : 
                      recalled.mitigationStrategy.includes('LIMIT') ? 'RESOURCE_LIMIT' : 'RESTART';
      confidence = recalled.affinityScore;
      
      console.log(`🎯 [Orchestrator] Semantic recall success! Matching Memory ID: ${recalled.id}. Retried strategy [${healingAction}] (Confidence: ${confidence.toFixed(1)}%)`);
      natsClient.publish('memory.recalled', {
        ticket,
        recalledMemoryId: recalled.id,
        mitigation: healingAction,
        confidence
      });
    } else {
      // 2. Clonal Selection + somatic hypermutation
      console.log(`🧫 [Orchestrator] No matching high-affinity memory. Evolving new B-Cell antibody...`);
      const evolved = ClonalSelectionEngine.generateAntibody(ticket.threatType);
      healingAction = evolved.actionType;
      confidence = evolved.affinity;
      
      natsClient.publish('antibody.generated', {
        ticket,
        actionType: healingAction,
        affinity: confidence
      });
    }

    // 3. Dispatch remediation
    const success = await ResponseCoordinator.dispatchRemediation(ticket.podId, healingAction, dbEvent?.id);

    // 4. Reinforce B-cell somatic affinity weights based on outcome
    setTimeout(async () => {
      // Trace if pod returned to healthy status in SQLite
      let healingVerified = false;
      try {
        const checkPod = await prisma.pod.findUnique({ where: { id: ticket.podId } });
        healingVerified = checkPod?.podStatus === 'healthy';
      } catch (_) {
        healingVerified = true; // fallback
      }

      await ClonalSelectionEngine.reinforceAntibody(ticket.threatType, healingAction, healingVerified, success ? 95 : 40);
      await MemoryCellService.strengthenMemory(ticket.threatType, healingVerified);

      // Persist success/failure audit details
      try {
        if (dbEvent) {
          await prisma.dangerEvent.update({
            where: { id: dbEvent.id },
            data: { status: healingVerified ? 'resolved' : 'active' }
          });
        }
      } catch (_) {}

    }, 8000); // 8 seconds verification window
  }
}
