import { prisma } from '../../../shared/db/index.ts';

export interface TopologyNode {
  id: string;
  label: string;
  type: 'ingress' | 'service' | 'pod' | 'pvc' | 'node';
  status: 'healthy' | 'warning' | 'danger' | 'critical';
  cpu?: number;
  memory?: number;
  details?: string;
  cascadingRisk?: number; // 0 to 100 cascading failure threat propagation risk
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  relation: string;
  status: 'active' | 'stressed' | 'broken';
  latencyMs?: number;
}

export interface CompleteTopology {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export class DependencyGraphService {
  /**
   * Generates a visualization-ready topology graph.
   * Maps actual cluster pods, mock service layers, PVCs, and communication links.
   */
  static async buildTopology(): Promise<CompleteTopology> {
    try {
      const dbPods = await prisma.pod.findMany({
        include: { dangerEvents: { where: { status: { not: 'resolved' } } } }
      });
      
      const nodes: TopologyNode[] = [];
      const links: TopologyLink[] = [];

      // 1. Add Core Ingress entrypoint
      nodes.push({
        id: 'ingress-core',
        label: 'INGRESS GATEWAY',
        type: 'ingress',
        status: 'healthy',
        details: 'External Application Load Balancer',
        cascadingRisk: 0
      });

      // 2. Map pods from database into topology nodes
      const podMap = new Map<string, TopologyNode>();
      for (const p of dbPods) {
        // Map database statuses into topology statuses
        let status: 'healthy' | 'warning' | 'danger' | 'critical' = 'healthy';
        if (p.podStatus === 'critical' || p.dangerLevel === 'critical') status = 'critical';
        else if (p.podStatus === 'infected' || p.dangerLevel === 'high') status = 'danger';
        else if (p.podStatus === 'unstable' || p.dangerLevel === 'medium') status = 'warning';

        const node: TopologyNode = {
          id: p.id,
          label: p.podName?.toUpperCase() || 'POD-NODE',
          type: 'pod',
          status,
          cpu: p.cpuUsage || 20.0,
          memory: p.memoryUsage || 35.0,
          details: `Namespace: ${p.namespace || 'default'} | PVC Latency: ${p.pvcLatency || 2}ms`,
          cascadingRisk: 0
        };

        nodes.push(node);
        podMap.set(p.id, node);
      }

      // 3. Create PVC relationships
      nodes.push({
        id: 'pvc-storage-ssd',
        label: 'METABOLIC DATASTORE PVC',
        type: 'pvc',
        status: 'healthy',
        details: 'SSD Dynamic Provisioner Block Storage',
        cascadingRisk: 0
      });

      // 4. Establish connections/links between nodes dynamically
      const podList = Array.from(podMap.values());
      
      // Hook Ingress to Frontend Pods
      const frontends = podList.filter(p => p.label.includes('FRONT') || p.label.includes('UI') || p.label.includes('API') || p.label.includes('GATE'));
      for (const f of frontends) {
        links.push({
          id: `link-ingress-${f.id}`,
          source: 'ingress-core',
          target: f.id,
          relation: 'routes-to',
          status: f.status === 'critical' ? 'broken' : f.status === 'danger' ? 'stressed' : 'active',
          latencyMs: 12 + Math.random() * 8
        });
      }

      // Establish Service-to-Service linkages (e.g. Frontend to Backend to DB pods)
      const backends = podList.filter(p => p.label.includes('BACK') || p.label.includes('CORE') || p.label.includes('SERVICE') || p.label.includes('TREATMENT') || p.label.includes('PATROL'));
      const dbEndpoints = podList.filter(p => p.label.includes('DB') || p.label.includes('DATA') || p.label.includes('REDIS') || p.label.includes('POSTGRES'));

      for (const f of frontends) {
        for (const b of backends) {
          links.push({
            id: `link-${f.id}-${b.id}`,
            source: f.id,
            target: b.id,
            relation: 'gRPC-call',
            status: b.status === 'critical' ? 'broken' : b.status === 'danger' ? 'stressed' : 'active',
            latencyMs: 34 + Math.random() * 15
          });
        }
      }

      for (const b of backends) {
        for (const db of dbEndpoints) {
          links.push({
            id: `link-${b.id}-${db.id}`,
            source: b.id,
            target: db.id,
            relation: 'sql-query',
            status: db.status === 'critical' ? 'broken' : db.status === 'danger' ? 'stressed' : 'active',
            latencyMs: 4 + Math.random() * 4
          });

          // Connect storage PVCs to DB pods
          links.push({
            id: `link-pvc-${db.id}`,
            source: db.id,
            target: 'pvc-storage-ssd',
            relation: 'pvc-mount',
            status: 'active',
            latencyMs: 2
          });
        }
      }

      // Perform Cascading Failure Detection
      this.detectCascadingFailures(nodes, links);

      return { nodes, links };
    } catch (e) {
      console.error("❌ Failed to build dependency topology map:", e);
      return { nodes: [], links: [] };
    }
  }

  /**
   * Traverses the graph to identify and tag downstream cascading failure risks.
   * If a target resource has broken/stressed upstream dependencies, it propagates metabolic stress.
   */
  private static detectCascadingFailures(nodes: TopologyNode[], links: TopologyLink[]) {
    // 1. Identify infected / critical starting sources
    const brokenSources = new Set(nodes.filter(n => n.status === 'critical' || n.status === 'danger').map(n => n.id));
    if (brokenSources.size === 0) return;

    // 2. Perform a BFS propagation trace to mark cascading risks along links
    const visited = new Set<string>();
    const queue: { nodeId: string; accumulatedRisk: number }[] = [];

    for (const sourceId of brokenSources) {
      queue.push({ nodeId: sourceId, accumulatedRisk: 100 });
      visited.add(sourceId);
    }

    while (queue.length > 0) {
      const { nodeId, accumulatedRisk } = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      
      if (node && !brokenSources.has(nodeId)) {
        // Apply cascading failure warning if the threat risk is high
        node.cascadingRisk = Math.round(accumulatedRisk);
        if (accumulatedRisk > 50.0 && node.status === 'healthy') {
          node.status = 'warning';
          node.details = `⚠️ CASCADING IMMUNE SYSTEM RISK: ${node.details}`;
        }
      }

      // Find all target links where the current node is the target (downstream dependents)
      // If our database pod crashes, the backend calling it faces high stress.
      const downstreamLinks = links.filter(l => l.target === nodeId || l.source === nodeId);
      for (const link of downstreamLinks) {
        const dependentId = link.source === nodeId ? link.target : link.source;
        if (!visited.has(dependentId)) {
          visited.add(dependentId);
          // Attenuate risk as it cascades further down the topology tree
          const newRisk = accumulatedRisk * 0.7;
          
          if (newRisk > 20.0) {
            link.status = 'stressed';
            queue.push({ nodeId: dependentId, accumulatedRisk: newRisk });
          }
        }
      }
    }
  }
}
