import { IncidentRecord } from './types.ts';
import { BCellMemoryAgent } from './memory-agent.ts';
import { VerificationResult } from './verification-agent.ts';

export class LearningAgent {
  public static readonly AGENT_ID = 'Learning-Engine-01';

  public static async processOutcome(incident: IncidentRecord, verification: VerificationResult) {
    console.log(`🎓 [Learning Agent] Processing outcome for incident ${incident.id}: ${verification.isResolved ? 'SUCCESS' : 'FAILURE'}`);

    const signature = `${incident.severity}-${incident.signals.join('-')}`;

    if (verification.isResolved && incident.plan) {
      // 1. Boost affinity for the successful strategy
      BCellMemoryAgent.adjustAffinity(signature, true);

      // 2. Commit a consolidated memory cell
      BCellMemoryAgent.recordMemory({
        threatSignature: signature,
        rootCause: incident.diagnosis?.rootCause || 'Verified infrastructure remediation',
        remediationAction: incident.plan.actions[0].type,
        parameters: incident.plan.actions[0].parameters,
        affinityScore: 92.0,
        recoveryTimeMs: Date.now() - incident.detectedAt.getTime(),
      });

      console.log(`🧠 [Learning Agent] Reinforced memory cell for signature: ${signature}`);
    } else {
      // Penalize strategy confidence
      BCellMemoryAgent.adjustAffinity(signature, false);
      console.warn(`⚠️ [Learning Agent] Strategy confidence penalized for signature: ${signature}`);
    }
  }
}
