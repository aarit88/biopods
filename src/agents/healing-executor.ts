import { RemediationAction, ActionPlan } from './types.ts';
import { k8sProvider } from '../kubernetes/provider.ts';
import { K8sRemediationResult } from '../kubernetes/types.ts';
import { PolicySafetyAgent } from './policy-agent.ts';

export class HealingExecutorAgent {
  public static readonly AGENT_ID = 'Healing-Executor-01';

  private static rollbackRegistry: Map<string, RemediationAction[]> = new Map();

  public static async executeAction(action: RemediationAction): Promise<K8sRemediationResult> {
    console.log(`⚡ [Healing Executor] Executing action ${action.type} on ${action.namespace}/${action.target}`);

    PolicySafetyAgent.recordActionExecution(action.target);

    switch (action.type) {
      case 'SCALE_DEPLOYMENT': {
        const replicas = action.parameters.replicas || 2;
        return await k8sProvider.scaleDeployment(action.namespace, action.target, replicas);
      }
      case 'RESTART_DEPLOYMENT': {
        return await k8sProvider.restartDeployment(action.namespace, action.target);
      }
      case 'CORDON_NODE': {
        return await k8sProvider.cordonNode(action.target);
      }
      case 'QUARANTINE_POD': {
        return await k8sProvider.quarantinePod(action.namespace, action.target);
      }
      case 'DELETE_POD':
      case 'RESTART_POD':
      default: {
        return await k8sProvider.restartPod(action.namespace, action.target);
      }
    }
  }

  public static async executePlan(plan: ActionPlan): Promise<K8sRemediationResult[]> {
    const results: K8sRemediationResult[] = [];
    if (plan.rollbackPlan && plan.rollbackPlan.length > 0) {
      this.rollbackRegistry.set(plan.incidentId, plan.rollbackPlan);
    }

    for (const action of plan.actions) {
      const res = await this.executeAction(action);
      results.push(res);
      if (!res.success) {
        console.error(`❌ [Healing Executor] Action failed: ${res.details}`);
        break;
      }
    }

    return results;
  }

  public static async rollback(incidentId: string): Promise<boolean> {
    const rollbackActions = this.rollbackRegistry.get(incidentId);
    if (!rollbackActions || rollbackActions.length === 0) {
      console.warn(`⚠️ [Healing Executor] No rollback plan found for incident ${incidentId}`);
      return false;
    }

    console.log(`🔄 [Healing Executor] Executing rollback for incident ${incidentId}`);
    for (const action of rollbackActions) {
      await this.executeAction(action);
    }
    this.rollbackRegistry.delete(incidentId);
    return true;
  }
}
