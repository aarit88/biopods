import { ActionPlan, ActionPlanSchema, RemediationAction, IncidentRecord } from './types.ts';
import { DiagnosticResult } from './diagnostic-agent.ts';

export class PlanningAgent {
  public static readonly AGENT_ID = 'Planning-Engine-02';

  public static async createPlan(incident: IncidentRecord, diagnosis: DiagnosticResult): Promise<ActionPlan> {
    console.log(`📋 [Planning Agent] Formulating remediation plan for ${incident.id}`);

    // Determine target deployment name if pod belongs to a deployment
    let target = incident.targetResource;
    // Strip pod hash suffix (e.g. telemetry-engine-998db -> telemetry-engine)
    const deploymentCandidate = incident.targetResource.replace(/-[a-z0-9]{4,10}(-[a-z0-9]{4,10})?$/, '');

    const actions: RemediationAction[] = [];
    const rollbackPlan: RemediationAction[] = [];

    switch (diagnosis.recommendedAction) {
      case 'SCALE_DEPLOYMENT': {
        const replicas = diagnosis.parameters.replicas || 3;
        actions.push({
          type: 'SCALE_DEPLOYMENT',
          target: deploymentCandidate,
          namespace: incident.namespace,
          parameters: { replicas },
          riskLevel: 'MEDIUM',
          requiresApproval: false,
          estimatedRecoveryTimeSec: 15,
        });
        rollbackPlan.push({
          type: 'SCALE_DEPLOYMENT',
          target: deploymentCandidate,
          namespace: incident.namespace,
          parameters: { replicas: 1 },
          riskLevel: 'LOW',
          requiresApproval: false,
          estimatedRecoveryTimeSec: 10,
        });
        break;
      }

      case 'RESTART_DEPLOYMENT': {
        actions.push({
          type: 'RESTART_DEPLOYMENT',
          target: deploymentCandidate,
          namespace: incident.namespace,
          parameters: {},
          riskLevel: 'MEDIUM',
          requiresApproval: false,
          estimatedRecoveryTimeSec: 25,
        });
        break;
      }

      case 'QUARANTINE_POD': {
        actions.push({
          type: 'QUARANTINE_POD',
          target: incident.targetResource,
          namespace: incident.namespace,
          parameters: { isolationPolicy: 'strict' },
          riskLevel: 'HIGH',
          requiresApproval: true,
          estimatedRecoveryTimeSec: 5,
        });
        break;
      }

      case 'CORDON_NODE': {
        actions.push({
          type: 'CORDON_NODE',
          target: diagnosis.parameters.nodeName || 'node-beta-02',
          namespace: 'cluster-level',
          parameters: {},
          riskLevel: 'CRITICAL',
          requiresApproval: true,
          estimatedRecoveryTimeSec: 10,
        });
        break;
      }

      case 'RESTART_POD':
      default: {
        actions.push({
          type: 'RESTART_POD',
          target: incident.targetResource,
          namespace: incident.namespace,
          parameters: { gracePeriodSeconds: 15 },
          riskLevel: 'LOW',
          requiresApproval: false,
          estimatedRecoveryTimeSec: 10,
        });
        break;
      }
    }

    const rawPlan = {
      incidentId: incident.id,
      diagnosis: diagnosis.rootCause,
      confidence: diagnosis.confidence,
      rootCause: diagnosis.rootCause,
      evidence: diagnosis.evidence,
      actions,
      rollbackPlan,
      reasoningSummary: diagnosis.reasoning,
    };

    // Strict Schema Validation
    const validatedPlan = ActionPlanSchema.parse(rawPlan);
    return validatedPlan;
  }
}
