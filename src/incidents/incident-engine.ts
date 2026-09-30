import { EventEmitter } from 'events';
import { IncidentRecord, IncidentStatus, AutonomyLevel } from '../agents/types.ts';
import { DendriticDetectionAgent } from '../agents/dendritic-agent.ts';
import { TCellDiagnosticAgent } from '../agents/diagnostic-agent.ts';
import { PlanningAgent } from '../agents/planning-agent.ts';
import { PolicySafetyAgent } from '../agents/policy-agent.ts';
import { HealingExecutorAgent } from '../agents/healing-executor.ts';
import { VerificationAgent } from '../agents/verification-agent.ts';
import { LearningAgent } from '../agents/learning-agent.ts';

export class ConflictPreventionEngine {
  private static activeResourceLocks: Set<string> = new Set();

  public static acquireLock(resourceKey: string): boolean {
    if (this.activeResourceLocks.has(resourceKey)) {
      console.log(`🔒 [Conflict Prevention] Action rejected: Resource '${resourceKey}' is currently locked by another active healing routine.`);
      return false;
    }
    this.activeResourceLocks.add(resourceKey);
    return true;
  }

  public static releaseLock(resourceKey: string) {
    this.activeResourceLocks.delete(resourceKey);
  }

  public static isLocked(resourceKey: string): boolean {
    return this.activeResourceLocks.has(resourceKey);
  }
}

export class IncidentEngine extends EventEmitter {
  private incidents: Map<string, IncidentRecord> = new Map();
  private isOrchestrating = false;

  constructor() {
    super();
    this.seedBaselineIncidents();
  }

  public getIncidents(): IncidentRecord[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  public getIncident(id: string): IncidentRecord | undefined {
    return this.incidents.get(id);
  }

  public getPendingApprovals(): IncidentRecord[] {
    return Array.from(this.incidents.values()).filter(
      (i) => i.status === IncidentStatus.WAITING_FOR_APPROVAL
    );
  }

  /**
   * Primary Autonomous Pipeline Loop:
   * Observe -> Detect -> Diagnose -> Plan -> Safety Check -> Execute -> Verify -> Learn
   */
  public async processIncidentPipeline(incident: IncidentRecord): Promise<void> {
    const resourceKey = `${incident.namespace}/${incident.targetResource}`;

    // 1. Concurrency Conflict Prevention
    if (!ConflictPreventionEngine.acquireLock(resourceKey)) {
      return;
    }

    try {
      this.incidents.set(incident.id, incident);
      this.emitEvent('incident:detected', incident);

      // Phase 2: Diagnosing
      incident.status = IncidentStatus.DIAGNOSING;
      this.emitEvent('incident:state_changed', incident);

      const diagnosis = await TCellDiagnosticAgent.diagnose(incident);
      incident.diagnosis = {
        rootCause: diagnosis.rootCause,
        confidence: diagnosis.confidence,
        evidence: diagnosis.evidence,
        reasoning: diagnosis.reasoning,
      };
      this.emitEvent('incident:diagnosed', { incidentId: incident.id, diagnosis });

      // Phase 3: Planning
      incident.status = IncidentStatus.PLANNING;
      this.emitEvent('incident:state_changed', incident);

      const plan = await PlanningAgent.createPlan(incident, diagnosis);
      incident.plan = plan;
      this.emitEvent('incident:plan_generated', { incidentId: incident.id, plan });

      // Phase 4: Policy & Safety Assessment
      const policyCheck = PolicySafetyAgent.evaluatePlan(plan);
      if (!policyCheck.allowed) {
        console.warn(`🛑 [Safety Policy] Action blocked for incident ${incident.id}: ${policyCheck.violations.join(', ')}`);
        incident.status = IncidentStatus.FAILED;
        this.emitEvent('incident:policy_blocked', { incidentId: incident.id, violations: policyCheck.violations });
        return;
      }

      // Check if Human Approval is required
      if (policyCheck.requiresApproval) {
        incident.status = IncidentStatus.WAITING_FOR_APPROVAL;
        console.log(`✋ [Policy Gate] Incident ${incident.id} requires human approval (Risk: ${policyCheck.riskAssessment.overallRisk})`);
        this.emitEvent('incident:waiting_approval', incident);
        return; // Await external approval API call
      }

      // Phase 5: Execution
      await this.executeAndVerify(incident);
    } finally {
      ConflictPreventionEngine.releaseLock(resourceKey);
    }
  }

  public async approveIncident(incidentId: string, approvedBy: string = 'Operator'): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident || incident.status !== IncidentStatus.WAITING_FOR_APPROVAL || !incident.plan) {
      return false;
    }

    const resourceKey = `${incident.namespace}/${incident.targetResource}`;
    if (!ConflictPreventionEngine.acquireLock(resourceKey)) {
      return false;
    }

    try {
      console.log(`✅ [Human-in-the-Loop] Incident ${incidentId} approved by ${approvedBy}`);
      this.emitEvent('incident:approved', { incidentId, approvedBy });
      await this.executeAndVerify(incident);
      return true;
    } finally {
      ConflictPreventionEngine.releaseLock(resourceKey);
    }
  }

  public async rejectIncident(incidentId: string, reason: string): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident || incident.status !== IncidentStatus.WAITING_FOR_APPROVAL) {
      return false;
    }

    incident.status = IncidentStatus.FAILED;
    this.emitEvent('incident:rejected', { incidentId, reason });
    return true;
  }

  private async executeAndVerify(incident: IncidentRecord): Promise<void> {
    if (!incident.plan) return;

    incident.status = IncidentStatus.EXECUTING;
    this.emitEvent('incident:executing', incident);

    const execResults = await HealingExecutorAgent.executePlan(incident.plan);
    incident.executedActions = execResults.map((r) => ({
      actionId: r.actionId,
      actionType: r.actionType,
      target: r.targetResource,
      executedAt: r.timestamp,
      success: r.success,
      details: r.details,
    }));

    // Phase 6: Verification
    incident.status = IncidentStatus.VERIFYING;
    this.emitEvent('incident:verifying', incident);

    // Wait 2 seconds for cluster controller to process patch
    await new Promise((res) => setTimeout(res, 2000));
    const verification = await VerificationAgent.verifyRemediation(incident);
    incident.verification = verification;

    if (verification.isResolved) {
      incident.status = IncidentStatus.RESOLVED;
      incident.resolvedAt = new Date();
      await LearningAgent.processOutcome(incident, verification);
      this.emitEvent('incident:resolved', incident);
    } else {
      incident.status = IncidentStatus.FAILED;
      console.warn(`❌ [Verification Failed] Remediation did not resolve incident ${incident.id}. Initiating rollback.`);
      await HealingExecutorAgent.rollback(incident.id);
      incident.status = IncidentStatus.ROLLED_BACK;
      await LearningAgent.processOutcome(incident, verification);
      this.emitEvent('incident:failed', incident);
    }
  }

  public startContinuousSurveillance(intervalMs: number = 8000) {
    if (this.isOrchestrating) return;
    this.isOrchestrating = true;
    console.log(`🧬 [BioPods Autonomous Engine] Surveillance cycle engaged (Interval: ${intervalMs}ms)`);

    setInterval(async () => {
      try {
        const detected = await DendriticDetectionAgent.scanCluster();
        for (const candidate of detected) {
          // Avoid duplicate runs on already active incidents for this resource
          const existing = Array.from(this.incidents.values()).find(
            (i) => i.targetResource === candidate.targetResource &&
              i.status !== IncidentStatus.RESOLVED &&
              i.status !== IncidentStatus.FAILED &&
              i.status !== IncidentStatus.ROLLED_BACK
          );
          if (!existing) {
            await this.processIncidentPipeline(candidate);
          }
        }
      } catch (err: any) {
        console.error('Surveillance loop error:', err.message);
      }
    }, intervalMs);
  }

  private emitEvent(eventName: string, payload: any) {
    this.emit(eventName, payload);
    this.emit('broadcast', { type: eventName, data: payload, timestamp: new Date() });
  }

  private seedBaselineIncidents() {
    const inc1: IncidentRecord = {
      id: 'inc-oom-telemetry-01',
      clusterId: 'BioPods-Local-Cluster',
      targetResource: 'telemetry-engine-998db',
      namespace: 'immune-core',
      severity: 'critical',
      anomalyScore: 94,
      signals: ['PAMP: Container in CrashLoopBackOff state', 'PAMP: Container terminated by OOMKiller (Exit 137)'],
      status: IncidentStatus.DETECTED,
      detectedAt: new Date(Date.now() - 3600000),
    };
    this.incidents.set(inc1.id, inc1);
  }
}

export const incidentEngine = new IncidentEngine();
