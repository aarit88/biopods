export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  OBSERVER = 'OBSERVER',
}

export enum PodHealth {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
}

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Cluster {
  id: string;
  name: string;
  status: string;
}

export interface TelemetryPacket {
  podId: string;
  metrics: {
    cpu: number;
    memory: number;
    disk_io: number;
    network_in: number;
    network_out: number;
  };
  timestamp: Date;
}

export interface DangerEvent {
  id: string;
  podId: string;
  score: number;
  label: PodHealth;
  timestamp: Date;
  triggeringSignals: string[];
}

export interface ThreatVerified {
  id: string;
  podId: string;
  threatType: string;
  confidence: number;
  dangerEventId: string;
  timestamp: Date;
}

export interface ActionPlan {
  podId: string;
  antibodyId: string;
  actionType: string;
  params: any;
  affinity: number;
}
