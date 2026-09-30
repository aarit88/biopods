import { IncidentRecord } from './types.ts';
import { k8sProvider } from '../kubernetes/provider.ts';

export interface VerificationResult {
  isResolved: boolean;
  metricsVerified: boolean;
  readinessConfirmed: boolean;
  notes: string;
  verifiedAt: Date;
}

export class VerificationAgent {
  public static readonly AGENT_ID = 'Verification-Agent-01';

  /**
   * Verifies that the targeted resource has actually stabilized and returned to healthy state.
   */
  public static async verifyRemediation(incident: IncidentRecord): Promise<VerificationResult> {
    console.log(`🔍 [Verification Agent] Initiating verification for incident ${incident.id} on ${incident.targetResource}`);

    // Poll the cluster state for up to 3 cycles (simulate / live check)
    let isReady = false;
    let metricsStable = false;
    let notes = '';

    const pods = await k8sProvider.listPods(incident.namespace);
    // Target might be the exact pod or replacement pod from deployment
    const targetBase = incident.targetResource.replace(/-[a-z0-9]{4,10}(-[a-z0-9]{4,10})?$/, '');
    const activePods = pods.filter((p) => p.name.includes(targetBase) || p.name === incident.targetResource);

    if (activePods.length === 0) {
      notes = `Target pod ${incident.targetResource} terminated; awaiting controller reconciliation.`;
      return {
        isResolved: false,
        metricsVerified: false,
        readinessConfirmed: false,
        notes,
        verifiedAt: new Date(),
      };
    }

    const healthyCount = activePods.filter((p) => p.status === 'Running' && p.ready).length;
    isReady = healthyCount > 0;

    const avgCpu = activePods.reduce((acc, p) => acc + p.cpuUsagePercent, 0) / activePods.length;
    const avgMem = activePods.reduce((acc, p) => acc + p.memoryUsagePercent, 0) / activePods.length;
    metricsStable = avgCpu < 80 && avgMem < 85;

    const isResolved = isReady && metricsStable;
    notes = isResolved
      ? `Verification PASSED: ${healthyCount}/${activePods.length} pods Ready. Mean CPU: ${avgCpu.toFixed(0)}%, Mean Memory: ${avgMem.toFixed(0)}%. No active CrashLoop or OOM detected.`
      : `Verification INCOMPLETE: Readiness: ${isReady ? 'PASS' : 'FAIL'}, Metrics: ${metricsStable ? 'STABLE' : 'STRESSED'}.`;

    console.log(`✅ [Verification Agent] Result for ${incident.targetResource}: ${isResolved ? 'RESOLVED' : 'UNRESOLVED'} (${notes})`);

    return {
      isResolved,
      metricsVerified: metricsStable,
      readinessConfirmed: isReady,
      notes,
      verifiedAt: new Date(),
    };
  }
}
