import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seed Protocol: BioPods DNA Initialization...');

  // 1. Users
  const user = await prisma.user.upsert({
    where: { email: 'admin@biopods.io' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@biopods.io',
      passwordHash: 'argon2:$biopods$v=19$m=65536,t=3,p=4$hashedpassword', // Mock hash
      role: 'ADMIN',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  });

  // 2. Clusters
  const cluster = await prisma.cluster.create({
    data: {
      clusterName: 'BioPods-Primary-Cluster',
      environment: 'production',
      region: 'edge-industrial-zone-1',
      kubernetesVersion: 'v1.30.0',
      totalNodes: 12,
      status: 'healthy',
      immunityScore: 92.6,
    },
  });

  // 3. Nodes
  const nodeAlpha = await prisma.node.create({
    data: {
      clusterId: cluster.id,
      nodeName: 'node-alpha-01',
      cpuUsage: 44.2,
      memoryUsage: 61.3,
      diskUsage: 35.2,
      networkUsage: 22.1,
      nodeStatus: 'healthy',
      healthScore: 94.1,
    },
  });

  const nodeBeta = await prisma.node.create({
    data: {
      clusterId: cluster.id,
      nodeName: 'node-beta-02',
      cpuUsage: 87.9,
      memoryUsage: 91.2,
      diskUsage: 73.5,
      networkUsage: 65.4,
      nodeStatus: 'warning',
      healthScore: 68.5,
    },
  });

  // 4. Pods
  const authService = await prisma.pod.create({
    data: {
      clusterId: cluster.id,
      nodeId: nodeAlpha.id,
      podName: 'bio-auth-service',
      namespace: 'core-services',
      cpuUsage: 23.5,
      memoryUsage: 44.7,
      pvcLatency: 8.2,
      networkTraffic: 120.4,
      podStatus: 'healthy',
      dangerLevel: 'low',
      immunityState: 'stable',
      dependencyCount: 5,
    },
  });

  const telemetryEngine = await prisma.pod.create({
    data: {
      clusterId: cluster.id,
      nodeId: nodeBeta.id,
      podName: 'telemetry-engine',
      namespace: 'immune-core',
      cpuUsage: 91.8,
      memoryUsage: 96.4,
      pvcLatency: 45.6,
      networkTraffic: 402.2,
      podStatus: 'critical',
      dangerLevel: 'high',
      immunityState: 'infected',
      dependencyCount: 12,
    },
  });

  // 5. Danger Events
  const event1 = await prisma.dangerEvent.create({
    data: {
      podId: telemetryEngine.id,
      eventType: 'CPU Spike Infection',
      dangerScore: 91.5,
      severity: 'critical',
      infectionZone: 'zone-red-alpha',
      status: 'active',
      detectedBy: 'Dendritic-Agent-07',
    },
  });

  const event2 = await prisma.dangerEvent.create({
    data: {
      podId: telemetryEngine.id,
      eventType: 'Memory Leak Mutation',
      dangerScore: 84.7,
      severity: 'high',
      infectionZone: 'zone-red-beta',
      status: 'investigating',
      detectedBy: 'Dendritic-Agent-02',
    },
  });

  // 6. Immune Agents
  await prisma.immuneAgent.createMany({
    data: [
      {
        agentName: 'Dendritic-Agent-07',
        agentType: 'dendritic-cell',
        status: 'active',
        confidenceScore: 96.5,
        learningScore: 82.2,
        assignedZone: 'zone-red-alpha',
        activeTarget: 'telemetry-engine',
      },
      {
        agentName: 'TCell-Guardian-03',
        agentType: 't-cell',
        status: 'engaged',
        confidenceScore: 93.8,
        learningScore: 75.4,
        assignedZone: 'zone-red-alpha',
        activeTarget: 'CPU Spike Infection',
      },
      {
        agentName: 'BCell-Learner-09',
        agentType: 'b-cell',
        status: 'learning',
        confidenceScore: 88.1,
        learningScore: 97.3,
        assignedZone: 'memory-core',
        activeTarget: 'memory-pattern-analysis',
      },
    ],
  });

  // 7. Immune Responses
  await prisma.immuneResponse.create({
    data: {
      eventId: event1.id,
      responseType: 'pod-autoscale',
      actionTaken: 'Scaled telemetry-engine from 2 replicas to 5 replicas',
      successRate: 92.4,
      responseTimeMs: 284,
      triggeredBy: 'TCell-Guardian-03',
      responseStatus: 'successful',
    },
  });

  // 8. Memory Cells
  await prisma.memoryCell.createMany({
    data: [
      {
        threatSignature: 'high-cpu-network-spike-pattern',
        vectorId: 'vec-001-bio-threat',
        mitigationStrategy: 'horizontal-pod-autoscaler-response',
        affinityScore: 94.8,
        successCount: 16,
        lastSeen: new Date(),
      },
      {
        threatSignature: 'memory-leak-persistent-growth',
        vectorId: 'vec-002-bio-threat',
        mitigationStrategy: 'restart-deployment-and-resource-reset',
        affinityScore: 88.5,
        successCount: 9,
        lastSeen: new Date(),
      },
    ],
  });

  console.log('✅ Seed Protocol Complete: Cluster DNA successfully synthesized.');
}

main()
  .catch((e) => {
    console.error('❌ Seed Protocol Failure:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
