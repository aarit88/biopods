import { IncidentRecord } from './types.ts';
import { k8sProvider } from '../kubernetes/provider.ts';
import { BCellMemoryAgent } from './memory-agent.ts';

export interface DiagnosticResult {
  rootCause: string;
  confidence: number;
  evidence: string[];
  reasoning: string;
  recommendedAction: string;
  parameters: Record<string, any>;
  recognizedMemoryId?: string;
}

export class TCellDiagnosticAgent {
  public static readonly AGENT_ID = 'TCell-Guardian-03';

  public static async diagnose(incident: IncidentRecord): Promise<DiagnosticResult> {
    console.log(`🔬 [T-Cell Diagnostic Agent] Investigating incident ${incident.id} on ${incident.namespace}/${incident.targetResource}`);

    // 1. Gather Evidence from real Kubernetes state
    const pod = await k8sProvider.describePod(incident.namespace, incident.targetResource);
    const logs = await k8sProvider.getPodLogs(incident.namespace, incident.targetResource);
    const events = await k8sProvider.listEvents(incident.namespace);
    const relatedEvents = events.filter((e) => e.involvedObject.name === incident.targetResource);

    const evidence: string[] = [];
    if (pod?.status) {
      evidence.push(`Pod Status Phase: ${pod.status.phase || pod.status}`);
      const containerStatuses = pod.status.containerStatuses || [];
      for (const cs of containerStatuses) {
        if (cs.restartCount > 0) {
          evidence.push(`Container '${cs.name}' has ${cs.restartCount} restarts.`);
        }
        if (cs.lastState?.terminated) {
          evidence.push(`Container terminated with exit code ${cs.lastState.terminated.exitCode} (${cs.lastState.terminated.reason || 'Unknown'}).`);
        }
      }
    }

    if (relatedEvents.length > 0) {
      evidence.push(`Recent K8s Warning: ${relatedEvents[0].reason} - "${relatedEvents[0].message}"`);
    }

    if (logs.includes('OutOfMemoryError') || logs.includes('OOMKilled') || logs.includes('exit code 137')) {
      evidence.push(`Pod logs confirm heap exhaustion or memory limit exceeded.`);
    }

    // 2. Query B-Cell memory for historical antigen matches
    const memorySignature = `${incident.severity}-${incident.signals.join('-')}`;
    const memoryMatch = await BCellMemoryAgent.queryMemory(memorySignature);

    // 3. Synthesize Grounded Diagnosis
    let rootCause = 'Metabolic strain and abnormal container health state.';
    let recommendedAction = 'RESTART_POD';
    let parameters: Record<string, any> = {};
    let confidence = 0.85;

    if (evidence.some((e) => e.includes('137') || e.includes('OOM') || e.includes('memory limit'))) {
      rootCause = 'Process terminated by Linux kernel OOMKiller due to container memory limit breach.';
      recommendedAction = 'SCALE_DEPLOYMENT';
      parameters = { replicas: 3 };
      confidence = 0.95;
    } else if (evidence.some((e) => e.includes('CrashLoopBackOff') || e.includes('BackOff'))) {
      rootCause = 'Application process crashing repeatedly upon initialization or health check failure.';
      recommendedAction = 'RESTART_POD';
      parameters = { gracePeriodSeconds: 15 };
      confidence = 0.92;
    } else if (incident.signals.some((s) => s.includes('CPU') || s.includes('saturation'))) {
      rootCause = 'Excessive computational workload causing thread starvation and latency degradation.';
      recommendedAction = 'SCALE_DEPLOYMENT';
      parameters = { replicas: 3 };
      confidence = 0.88;
    } else if (memoryMatch) {
      rootCause = `Recognized historical pattern: ${memoryMatch.rootCause}`;
      recommendedAction = memoryMatch.remediationAction;
      parameters = memoryMatch.parameters;
      confidence = memoryMatch.affinityScore / 100;
    }

    const reasoning = `T-Cell receptor verified ${evidence.length} concrete data points from the cluster. ` +
      `Hypothesis established: ${rootCause} (Confidence: ${(confidence * 100).toFixed(0)}%). ` +
      `Recommended strategy: ${recommendedAction} based on ${memoryMatch ? 'retrieved immune memory' : 'adaptive heuristic'}.`;

    return {
      rootCause,
      confidence,
      evidence,
      reasoning,
      recommendedAction,
      parameters,
      recognizedMemoryId: memoryMatch?.id,
    };
  }
}
