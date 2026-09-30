import { IncidentRecord, IncidentStatus } from './types.ts';
import { k8sProvider } from '../kubernetes/provider.ts';

export interface TelemetrySignal {
  podId: string;
  namespace: string;
  cpuPercent: number;
  memoryPercent: number;
  restartDelta: number;
  pvcLatencyMs: number;
  networkSpike: boolean;
  statusString?: string;
}

export class DendriticDetectionAgent {
  public static readonly AGENT_ID = 'Dendritic-Detector-01';

  // Biologically grounded weights
  private static W_RESTART = 2.5; // Pathogen-associated molecular pattern (PAMP)
  private static W_CPU = 1.0;     // Danger signal (metabolic stress)
  private static W_MEM = 1.2;     // Danger signal (metabolic stress)
  private static W_LATENCY = 0.8; // Transport impedance
  private static ANOMALY_THRESHOLD = 60.0;

  /**
   * Evaluates telemetry and Kubernetes events to identify candidate incidents.
   */
  public static async scanCluster(): Promise<IncidentRecord[]> {
    const pods = await k8sProvider.listPods();
    const events = await k8sProvider.listEvents();
    const incidents: IncidentRecord[] = [];

    for (const pod of pods) {
      const relatedEvents = events.filter(
        (e) => e.involvedObject.name === pod.name && e.type === 'Warning'
      );

      const incident = this.evaluatePod(pod, relatedEvents);
      if (incident) {
        incidents.push(incident);
      }
    }

    return incidents;
  }

  public static evaluatePod(pod: any, warningEvents: any[]): IncidentRecord | null {
    let score = 0;
    const signals: string[] = [];

    // 1. CrashLoopBackOff or OOMKilled is a primary PAMP signal
    if (pod.status === 'CrashLoopBackOff') {
      score += 50;
      signals.push(`PAMP: Container in CrashLoopBackOff state`);
    } else if (pod.status === 'OOMKilled') {
      score += 55;
      signals.push(`PAMP: Container terminated by OOMKiller (Exit 137)`);
    } else if (pod.status === 'Pending') {
      score += 40;
      signals.push(`Danger: Pod pending scheduling`);
    }

    // 2. High restart count
    if (pod.restartCount > 3) {
      const restartScore = Math.min(30, pod.restartCount * this.W_RESTART);
      score += restartScore;
      signals.push(`PAMP: Excessive container restarts (${pod.restartCount} restarts)`);
    }

    // 3. Resource saturation
    if (pod.cpuUsagePercent > 85) {
      score += (pod.cpuUsagePercent - 85) * this.W_CPU + 15;
      signals.push(`Danger: CPU utilization near saturation (${pod.cpuUsagePercent}%)`);
    }
    if (pod.memoryUsagePercent > 85) {
      score += (pod.memoryUsagePercent - 85) * this.W_MEM + 15;
      signals.push(`Danger: Memory exhaustion risk (${pod.memoryUsagePercent}%)`);
    }

    // 4. PVC latency
    if (pod.pvcLatencyMs > 25) {
      score += 15;
      signals.push(`Danger: PVC storage I/O latency spike (${pod.pvcLatencyMs}ms)`);
    }

    // 5. Correlate K8s warning events
    if (warningEvents.length > 0) {
      score += Math.min(25, warningEvents.length * 5);
      signals.push(`K8s: ${warningEvents.length} warning events recorded (Reason: ${warningEvents[0].reason})`);
    }

    score = Math.min(100, Math.round(score));

    if (score >= this.ANOMALY_THRESHOLD) {
      const severity = score >= 85 ? 'critical' : score >= 70 ? 'high' : 'medium';
      return {
        id: `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        clusterId: 'BioPods-Local-Cluster',
        targetResource: pod.name,
        namespace: pod.namespace,
        severity,
        anomalyScore: score,
        signals,
        status: IncidentStatus.DETECTED,
        detectedAt: new Date(),
      };
    }

    return null;
  }
}
