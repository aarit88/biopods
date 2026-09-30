import { z } from 'zod';

export enum AgentRole {
  DENDRITIC_DETECTOR = 'DENDRITIC_DETECTOR',
  TCELL_DIAGNOSTICIAN = 'TCELL_DIAGNOSTICIAN',
  BCELL_MEMORY = 'BCELL_MEMORY',
  PLANNING_AGENT = 'PLANNING_AGENT',
  POLICY_SAFETY_AGENT = 'POLICY_SAFETY_AGENT',
  HEALING_EXECUTOR = 'HEALING_EXECUTOR',
  VERIFICATION_AGENT = 'VERIFICATION_AGENT',
  LEARNING_AGENT = 'LEARNING_AGENT',
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  TRIAGING = 'TRIAGING',
  DIAGNOSING = 'DIAGNOSING',
  PLANNING = 'PLANNING',
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',
  EXECUTING = 'EXECUTING',
  VERIFYING = 'VERIFYING',
  RESOLVED = 'RESOLVED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum AutonomyLevel {
  LEVEL_0_OBSERVE = 0,
  LEVEL_1_RECOMMEND = 1,
  LEVEL_2_AUTO_LOW = 2,
  LEVEL_3_AUTO_MEDIUM = 3,
  LEVEL_4_FULL_AUTONOMY = 4,
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const RemediationActionSchema = z.object({
  type: z.enum([
    'RESTART_POD',
    'DELETE_POD',
    'SCALE_DEPLOYMENT',
    'RESTART_DEPLOYMENT',
    'ROLLBACK_DEPLOYMENT',
    'CORDON_NODE',
    'QUARANTINE_POD',
  ]),
  target: z.string().min(1),
  namespace: z.string().min(1).default('default'),
  parameters: z.record(z.any()).default({}),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  requiresApproval: z.boolean().default(false),
  estimatedRecoveryTimeSec: z.number().default(15),
});

export type RemediationAction = z.infer<typeof RemediationActionSchema>;

export const ActionPlanSchema = z.object({
  incidentId: z.string(),
  diagnosis: z.string(),
  confidence: z.number().min(0).max(1),
  rootCause: z.string(),
  evidence: z.array(z.string()),
  actions: z.array(RemediationActionSchema).min(1),
  rollbackPlan: z.array(RemediationActionSchema).default([]),
  reasoningSummary: z.string(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export interface IncidentRecord {
  id: string;
  clusterId: string;
  targetResource: string;
  namespace: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  anomalyScore: number;
  signals: string[];
  status: IncidentStatus;
  detectedAt: Date;
  diagnosis?: {
    rootCause: string;
    confidence: number;
    evidence: string[];
    reasoning: string;
  };
  plan?: ActionPlan;
  executedActions?: Array<{
    actionId: string;
    actionType: string;
    target: string;
    executedAt: Date;
    success: boolean;
    details: string;
  }>;
  verification?: {
    isResolved: boolean;
    verifiedAt: Date;
    metricsVerified: boolean;
    readinessConfirmed: boolean;
    notes: string;
  };
  resolvedAt?: Date;
}

export interface IncidentMemoryCell {
  id: string;
  threatSignature: string;
  rootCause: string;
  remediationAction: string;
  parameters: Record<string, any>;
  affinityScore: number;
  successCount: number;
  failureCount: number;
  recoveryTimeMs: number;
  lastSeen: Date;
}
