import { prisma } from '../db/index.ts';

export interface AntibodyPattern {
  actionType: string; // 'RESTART' | 'SCALE' | 'ISOLATE' | 'RESOURCE_LIMIT'
  parameters: Record<string, any>;
  affinity: number; // 0 to 100 representing adaptive binding score
  successCount: number;
  failureCount: number;
}

export class ClonalSelectionEngine {
  // Primary antibody pool (B-cell repertoire)
  private static antibodyPool: Map<string, AntibodyPattern[]> = new Map();

  /**
   * Initializes the B-cell repertoire with seed antibodies for common threat archetypes.
   */
  static initializeRepertoire() {
    // Seed B-cells for CPU saturation threats
    this.antibodyPool.set('cpu-spike', [
      { actionType: 'SCALE', parameters: { replicas: 1, limitCpu: 'increase' }, affinity: 70.0, successCount: 0, failureCount: 0 },
      { actionType: 'RESTART', parameters: { gracePeriod: 30 }, affinity: 50.0, successCount: 0, failureCount: 0 },
      { actionType: 'RESOURCE_LIMIT', parameters: { cpuLimit: '2000m', memLimit: '4Gi' }, affinity: 60.0, successCount: 0, failureCount: 0 },
    ]);

    // Seed B-cells for memory leaks
    this.antibodyPool.set('memory-leak', [
      { actionType: 'RESTART', parameters: { gracePeriod: 10, cleanCache: true }, affinity: 80.0, successCount: 0, failureCount: 0 },
      { actionType: 'RESOURCE_LIMIT', parameters: { memLimit: 'increase_50' }, affinity: 65.0, successCount: 0, failureCount: 0 },
      { actionType: 'ISOLATE', parameters: { drainNode: false }, affinity: 40.0, successCount: 0, failureCount: 0 },
    ]);

    // Seed B-cells for network spikes / security threats
    this.antibodyPool.set('network-anomaly', [
      { actionType: 'ISOLATE', parameters: { networkPolicy: 'quarantine' }, affinity: 85.0, successCount: 0, failureCount: 0 },
      { actionType: 'RESTART', parameters: { patchAgent: true }, affinity: 45.0, successCount: 0, failureCount: 0 },
      { actionType: 'SCALE', parameters: { rateLimit: true }, affinity: 60.0, successCount: 0, failureCount: 0 },
    ]);
  }

  /**
   * Selects, clones, and mutates antibodies for a specific threat pattern (antigen).
   * High-affinity B-cells are cloned at higher rates and undergo hypermutation.
   */
  static generateAntibody(threatType: string): AntibodyPattern {
    const key = this.normalizeThreatKey(threatType);
    if (!this.antibodyPool.has(key) || this.antibodyPool.get(key)!.length === 0) {
      this.initializeRepertoire();
    }

    const pool = this.antibodyPool.get(key) || this.antibodyPool.get('cpu-spike')!;
    
    // Sort pool by affinity
    pool.sort((a, b) => b.affinity - a.affinity);
    
    // Select best antibody (highest affinity)
    const bestParent = pool[0];

    // Clonal Selection: If the best antibody has high affinity, we clone it and mutate it slightly to optimize.
    // If affinity is low, we hyper-mutate (wide search space exploration).
    const isHighAffinity = bestParent.affinity > 75.0;
    const mutationRate = isHighAffinity ? 0.1 : 0.4; // Somatic Hypermutation

    const clone: AntibodyPattern = {
      actionType: bestParent.actionType,
      parameters: this.mutateParameters(bestParent.actionType, bestParent.parameters, mutationRate),
      affinity: bestParent.affinity,
      successCount: 0,
      failureCount: 0
    };

    console.log(`🧫 [B-Cell Evolution] Cloned & Mutated antibody from parent [${bestParent.actionType}] (Affinity: ${bestParent.affinity.toFixed(1)}%). Mutation rate: ${mutationRate * 100}%`);
    return clone;
  }

  /**
   * Mutates the parameters of an action plan (Somatic Hypermutation simulation).
   */
  private static mutateParameters(actionType: string, params: Record<string, any>, rate: number): Record<string, any> {
    const mutated = { ...params };
    if (Math.random() > rate) return mutated;

    if (actionType === 'SCALE') {
      const replicas = params.replicas || 1;
      mutated.replicas = Math.max(1, replicas + (Math.random() > 0.5 ? 1 : -1));
    } else if (actionType === 'RESTART') {
      const grace = params.gracePeriod || 30;
      mutated.gracePeriod = Math.max(5, grace + (Math.random() > 0.5 ? 5 : -5));
    } else if (actionType === 'RESOURCE_LIMIT') {
      mutated.cpuLimit = Math.random() > 0.5 ? '2000m' : '2500m';
      mutated.memLimit = Math.random() > 0.5 ? '4Gi' : '6Gi';
    } else if (actionType === 'ISOLATE') {
      mutated.networkPolicy = Math.random() > 0.5 ? 'strict-quarantine' : 'selective-contain';
    }

    return mutated;
  }

  /**
   * Reinforcement weight updates based on actual success rate of the healing action.
   */
  static async reinforceAntibody(threatType: string, actionTaken: string, success: boolean, successRate: number) {
    const key = this.normalizeThreatKey(threatType);
    const pool = this.antibodyPool.get(key) || [];
    
    // Find matching antibody in the pool
    const match = pool.find(a => actionTaken.toLowerCase().includes(a.actionType.toLowerCase()));
    
    if (match) {
      if (success) {
        match.successCount++;
        // Boost affinity (binding strength)
        match.affinity = Math.min(99.9, match.affinity + (successRate / 10));
      } else {
        match.failureCount++;
        // Reduce affinity (apoptosis / selection decay)
        match.affinity = Math.max(10.0, match.affinity - 15.0);
      }
      
      console.log(`🧬 [B-Cell Reinforcement] Updated antibody [${match.actionType}] for threat [${key}]. New Affinity: ${match.affinity.toFixed(1)}%`);
      
      // Persist the B-Cell antibody evolution state in SQLite Database via MemoryCell
      try {
        const signature = `evolution-${key}-${match.actionType.toLowerCase()}`;
        await prisma.memoryCell.upsert({
          where: { id: signature },
          update: {
            affinityScore: match.affinity,
            successCount: match.successCount,
            lastSeen: new Date(),
            mitigationStrategy: `Evolved action: ${match.actionType} with params ${JSON.stringify(match.parameters)}`
          },
          create: {
            id: signature,
            threatSignature: `evolved-${key}`,
            vectorId: `vec-evolved-${Date.now()}`,
            mitigationStrategy: `Evolved action: ${match.actionType} with params ${JSON.stringify(match.parameters)}`,
            affinityScore: match.affinity,
            successCount: match.successCount,
            lastSeen: new Date()
          }
        });
      } catch (dbErr) {
        // DB busy, suppress
      }
    }
  }

  private static normalizeThreatKey(threatType: string): string {
    const lower = threatType.toLowerCase();
    if (lower.includes('cpu') || lower.includes('load') || lower.includes('saturation')) return 'cpu-spike';
    if (lower.includes('leak') || lower.includes('memory') || lower.includes('oom')) return 'memory-leak';
    return 'network-anomaly';
  }

  static getRepertoire(): Map<string, AntibodyPattern[]> {
    return this.antibodyPool;
  }
}
