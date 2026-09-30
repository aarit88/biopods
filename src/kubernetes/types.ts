export interface K8sClusterInfo {
  id: string;
  name: string;
  server: string;
  version: string;
  status: 'connected' | 'disconnected' | 'simulated';
  nodesCount: number;
  podsCount: number;
  healthyPodsCount: number;
  unhealthyPodsCount: number;
  immunityScore: number;
}

export interface K8sNodeInfo {
  name: string;
  status: 'Ready' | 'NotReady' | 'Cordoned' | 'Unknown';
  roles: string[];
  version: string;
  cpuCapacity: string;
  memoryCapacity: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  conditions: Array<{ type: string; status: string; reason?: string; message?: string }>;
  isSchedulable: boolean;
}

export interface K8sPodInfo {
  name: string;
  namespace: string;
  nodeName: string;
  status: 'Running' | 'Pending' | 'Failed' | 'CrashLoopBackOff' | 'OOMKilled' | 'Unknown';
  ready: boolean;
  restartCount: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  pvcLatencyMs: number;
  networkTrafficKbps: number;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  immunityState: 'stable' | 'infected' | 'recovering' | 'protected';
  containers: Array<{
    name: string;
    image: string;
    ready: boolean;
    restartCount: number;
    state: string;
    exitCode?: number;
  }>;
  labels: Record<string, string>;
  createdAt: Date;
}

export interface K8sDeploymentInfo {
  name: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  readyReplicas: number;
  strategy: string;
  image: string;
  conditions: Array<{ type: string; status: string; reason?: string; message?: string }>;
}

export interface K8sEventInfo {
  id: string;
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  involvedObject: {
    kind: string;
    name: string;
    namespace: string;
  };
  firstTimestamp: Date;
  lastTimestamp: Date;
  count: number;
}

export interface K8sRemediationResult {
  actionId: string;
  targetResource: string;
  namespace: string;
  actionType: string;
  success: boolean;
  executionMode: 'cluster' | 'simulated';
  beforeState: any;
  afterState: any;
  details: string;
  timestamp: Date;
  rollbackAvailable: boolean;
}
