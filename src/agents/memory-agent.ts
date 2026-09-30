import { IncidentMemoryCell } from './types.ts';

export class BCellMemoryAgent {
  public static readonly AGENT_ID = 'BCell-Learner-09';

  // In-memory memory cell repertoire
  private static memoryRepertoire: IncidentMemoryCell[] = [
    {
      id: 'mem-oom-01',
      threatSignature: 'oom-memory-exhaustion-exit-137',
      rootCause: 'Container exceeded memory limits leading to kernel SIGKILL 137',
      remediationAction: 'SCALE_DEPLOYMENT',
      parameters: { replicas: 3 },
      affinityScore: 94.5,
      successCount: 18,
      failureCount: 1,
      recoveryTimeMs: 4200,
      lastSeen: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: 'mem-crashloop-02',
      threatSignature: 'crashloop-backoff-failed-startup',
      rootCause: 'Deadlocked application process or broken state partition',
      remediationAction: 'RESTART_POD',
      parameters: { gracePeriodSeconds: 15 },
      affinityScore: 89.2,
      successCount: 24,
      failureCount: 2,
      recoveryTimeMs: 8500,
      lastSeen: new Date(Date.now() - 3600000 * 6),
    },
    {
      id: 'mem-cpu-saturation-03',
      threatSignature: 'cpu-spike-traffic-surge',
      rootCause: 'Traffic flood exceeding single pod processing capacity',
      remediationAction: 'SCALE_DEPLOYMENT',
      parameters: { replicas: 4 },
      affinityScore: 96.0,
      successCount: 31,
      failureCount: 0,
      recoveryTimeMs: 5100,
      lastSeen: new Date(Date.now() - 3600000 * 12),
    },
    {
      id: 'mem-network-infection-04',
      threatSignature: 'scada-jitter-unauthorized-probe',
      rootCause: 'Malicious probe vector attempting unauthorized ingress',
      remediationAction: 'QUARANTINE_POD',
      parameters: { isolationPolicy: 'strict' },
      affinityScore: 97.4,
      successCount: 14,
      failureCount: 0,
      recoveryTimeMs: 1200,
      lastSeen: new Date(Date.now() - 86400000),
    },
  ];

  public static async queryMemory(signature: string): Promise<IncidentMemoryCell | null> {
    const queryVector = this.computeSignatureVector(signature);
    let bestMatch: IncidentMemoryCell | null = null;
    let highestSimilarity = -1;

    for (const cell of this.memoryRepertoire) {
      const cellVector = this.computeSignatureVector(cell.threatSignature);
      const sim = this.cosineSimilarity(queryVector, cellVector);
      if (sim > highestSimilarity && sim > 0.4) {
        highestSimilarity = sim;
        bestMatch = cell;
      }
    }

    if (bestMatch) {
      console.log(`🧠 [B-Cell Memory] Recalled memory cell [${bestMatch.id}] for signature "${signature}" (Similarity: ${(highestSimilarity * 100).toFixed(1)}%)`);
    }

    return bestMatch;
  }

  public static listMemories(): IncidentMemoryCell[] {
    return [...this.memoryRepertoire];
  }

  public static recordMemory(cell: Omit<IncidentMemoryCell, 'id' | 'lastSeen' | 'successCount' | 'failureCount'>) {
    const existing = this.memoryRepertoire.find((m) => m.threatSignature === cell.threatSignature);
    if (existing) {
      existing.lastSeen = new Date();
      existing.affinityScore = Math.min(100, existing.affinityScore + 2);
      existing.successCount += 1;
    } else {
      const newCell: IncidentMemoryCell = {
        ...cell,
        id: `mem-${Date.now().toString(36)}`,
        lastSeen: new Date(),
        successCount: 1,
        failureCount: 0,
      };
      this.memoryRepertoire.unshift(newCell);
    }
  }

  public static adjustAffinity(signature: string, success: boolean) {
    const memory = this.memoryRepertoire.find((m) => m.threatSignature.includes(signature) || signature.includes(m.threatSignature));
    if (memory) {
      if (success) {
        memory.affinityScore = Math.min(100, memory.affinityScore + 3.0);
        memory.successCount += 1;
      } else {
        memory.affinityScore = Math.max(20, memory.affinityScore - 10.0);
        memory.failureCount += 1;
      }
    }
  }

  // ── Vector computation & Cosine Similarity ──────────────────────────────
  private static computeSignatureVector(text: string): number[] {
    const vector = new Array(32).fill(0);
    const words = text.toLowerCase().split(/[\s\-_:,]+/);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % 32;
      vector[index] += 1;
    }
    return vector;
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
