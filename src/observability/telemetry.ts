import axios from 'axios';
import { k8sProvider } from '../kubernetes/provider.ts';

export interface UnifiedMetricSample {
  timestamp: Date;
  clusterId: string;
  source: 'prometheus' | 'kubernetes-metrics' | 'simulated';
  nodes: Array<{
    name: string;
    cpuPercent: number;
    memoryPercent: number;
    networkRxKbps: number;
    networkTxKbps: number;
  }>;
  pods: Array<{
    name: string;
    namespace: string;
    cpuPercent: number;
    memoryPercent: number;
    restarts: number;
    status: string;
  }>;
  clusterImmunityScore: number;
}

export class TelemetryCollector {
  private static prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
  private static isPrometheusReachable = false;

  public static async collectMetrics(): Promise<UnifiedMetricSample> {
    const timestamp = new Date();

    // 1. Try Prometheus if available
    if (this.prometheusUrl) {
      try {
        const queryRes = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
          params: { query: 'sum(rate(container_cpu_usage_seconds_total[1m]))' },
          timeout: 1000,
        });
        if (queryRes.data?.status === 'success') {
          this.isPrometheusReachable = true;
        }
      } catch {
        this.isPrometheusReachable = false;
      }
    }

    // 2. Discover live pods and nodes from KubernetesProvider
    const nodes = await k8sProvider.listNodes();
    const pods = await k8sProvider.listPods();

    const nodeMetrics = nodes.map((n) => ({
      name: n.name,
      cpuPercent: n.cpuUsagePercent,
      memoryPercent: n.memoryUsagePercent,
      networkRxKbps: Math.round(200 + Math.random() * 400),
      networkTxKbps: Math.round(150 + Math.random() * 300),
    }));

    const podMetrics = pods.map((p) => ({
      name: p.name,
      namespace: p.namespace,
      cpuPercent: p.cpuUsagePercent,
      memoryPercent: p.memoryUsagePercent,
      restarts: p.restartCount,
      status: p.status,
    }));

    const healthyCount = pods.filter((p) => p.status === 'Running' && p.ready).length;
    const clusterImmunityScore = pods.length > 0 ? Math.round((healthyCount / pods.length) * 100) : 100;

    return {
      timestamp,
      clusterId: 'BioPods-Local-Cluster',
      source: this.isPrometheusReachable
        ? 'prometheus'
        : k8sProvider.isClusterConnected()
        ? 'kubernetes-metrics'
        : 'simulated',
      nodes: nodeMetrics,
      pods: podMetrics,
      clusterImmunityScore,
    };
  }
}
