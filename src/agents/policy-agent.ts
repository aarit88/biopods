import { ActionPlan, RemediationAction, AutonomyLevel } from './types.ts';

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  violations: string[];
  riskAssessment: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    blastRadius: number; // Downstream impact score
  };
}

export class PolicySafetyAgent {
  public static readonly AGENT_ID = 'Policy-Safety-Guard-01';

  private static BLOCKED_NAMESPACES = ['kube-system', 'kube-public', 'kube-node-lease'];
  private static MAX_REPLICAS_LIMIT = 8;
  private static COOLDOWN_MS = 15000; // 15 seconds cooldown per target resource
  private static lastActionTimestamps: Map<string, number> = new Map();

  public static currentAutonomyLevel: AutonomyLevel = AutonomyLevel.LEVEL_3_AUTO_MEDIUM;

  public static setAutonomyLevel(level: AutonomyLevel) {
    this.currentAutonomyLevel = level;
    console.log(`🛡️ [Policy Agent] Cluster Autonomy Level set to: LEVEL ${level}`);
  }

  public static evaluatePlan(plan: ActionPlan): PolicyEvaluationResult {
    const violations: string[] = [];
    let highestRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let maxBlastRadius = 1;

    for (const action of plan.actions) {
      // 1. Blocked Namespace Gate
      if (this.BLOCKED_NAMESPACES.includes(action.namespace)) {
        violations.push(`Namespace '${action.namespace}' is protected by cluster security policy.`);
      }

      // 2. Cooldown Gate
      const lastRun = this.lastActionTimestamps.get(action.target);
      const now = Date.now();
      if (lastRun && now - lastRun < this.COOLDOWN_MS) {
        const waitSec = Math.ceil((this.COOLDOWN_MS - (now - lastRun)) / 1000);
        violations.push(`Resource '${action.target}' is under cooldown. Please wait ${waitSec}s.`);
      }

      // 3. Replica Ceiling Gate
      if (action.type === 'SCALE_DEPLOYMENT' && action.parameters.replicas > this.MAX_REPLICAS_LIMIT) {
        violations.push(`Requested ${action.parameters.replicas} replicas exceeds absolute ceiling of ${this.MAX_REPLICAS_LIMIT}.`);
      }

      // 4. Update highest risk
      if (action.riskLevel === 'CRITICAL') {
        highestRisk = 'CRITICAL';
        maxBlastRadius = Math.max(maxBlastRadius, 8);
      } else if (action.riskLevel === 'HIGH' && highestRisk !== 'CRITICAL') {
        highestRisk = 'HIGH';
        maxBlastRadius = Math.max(maxBlastRadius, 5);
      } else if (action.riskLevel === 'MEDIUM' && highestRisk === 'LOW') {
        highestRisk = 'MEDIUM';
        maxBlastRadius = Math.max(maxBlastRadius, 3);
      }
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        requiresApproval: false,
        violations,
        riskAssessment: { overallRisk: highestRisk, blastRadius: maxBlastRadius },
      };
    }

    // 5. Evaluate Autonomy Level against Risk
    let requiresApproval = false;
    switch (this.currentAutonomyLevel) {
      case AutonomyLevel.LEVEL_0_OBSERVE:
        requiresApproval = true;
        break;
      case AutonomyLevel.LEVEL_1_RECOMMEND:
        requiresApproval = true;
        break;
      case AutonomyLevel.LEVEL_2_AUTO_LOW:
        if (highestRisk !== 'LOW') requiresApproval = true;
        break;
      case AutonomyLevel.LEVEL_3_AUTO_MEDIUM:
        if (highestRisk === 'HIGH' || highestRisk === 'CRITICAL') requiresApproval = true;
        break;
      case AutonomyLevel.LEVEL_4_FULL_AUTONOMY:
        if (highestRisk === 'CRITICAL') requiresApproval = true;
        break;
    }

    return {
      allowed: true,
      requiresApproval,
      violations: [],
      riskAssessment: { overallRisk: highestRisk, blastRadius: maxBlastRadius },
    };
  }

  public static recordActionExecution(target: string) {
    this.lastActionTimestamps.set(target, Date.now());
  }

  public static clearCooldown(target: string) {
    this.lastActionTimestamps.delete(target);
  }
}
