import { PolicySafetyAgent } from '../src/agents/policy-agent.ts';
import { ActionPlan, AutonomyLevel } from '../src/agents/types.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runPolicyTests() {
  console.log('🧪 Starting Policy Safety Agent Test Suite...');

  // Test 1: Blocked namespace protection
  const blockedPlan: ActionPlan = {
    incidentId: 'test-inc-01',
    diagnosis: 'System core memory leak',
    confidence: 0.95,
    rootCause: 'Core coredns leak',
    evidence: ['K8s Warning'],
    actions: [
      {
        type: 'RESTART_POD',
        target: 'coredns-77884',
        namespace: 'kube-system',
        parameters: {},
        riskLevel: 'LOW',
        requiresApproval: false,
        estimatedRecoveryTimeSec: 10,
      },
    ],
    rollbackPlan: [],
    reasoningSummary: 'Test plan',
  };

  const eval1 = PolicySafetyAgent.evaluatePlan(blockedPlan);
  assert(!eval1.allowed, 'Should block actions in kube-system namespace');
  assert(eval1.violations.some((v) => v.includes('kube-system')), 'Should cite namespace policy violation');
  console.log('  ✅ Test 1 Passed: Protected namespace enforced.');

  // Test 2: Replica safety ceiling
  const excessiveScalePlan: ActionPlan = {
    incidentId: 'test-inc-02',
    diagnosis: 'Massive traffic spike',
    confidence: 0.9,
    rootCause: 'Traffic flood',
    evidence: ['99% CPU'],
    actions: [
      {
        type: 'SCALE_DEPLOYMENT',
        target: 'payment-service',
        namespace: 'default',
        parameters: { replicas: 20 }, // Exceeds limit of 8
        riskLevel: 'MEDIUM',
        requiresApproval: false,
        estimatedRecoveryTimeSec: 15,
      },
    ],
    rollbackPlan: [],
    reasoningSummary: 'Test plan',
  };

  const eval2 = PolicySafetyAgent.evaluatePlan(excessiveScalePlan);
  assert(!eval2.allowed, 'Should block scaling beyond safety ceiling');
  assert(eval2.violations.some((v) => v.includes('ceiling')), 'Should cite replica ceiling violation');
  console.log('  ✅ Test 2 Passed: Replica ceiling enforced.');

  // Test 3: Autonomy Level check
  PolicySafetyAgent.setAutonomyLevel(AutonomyLevel.LEVEL_1_RECOMMEND);
  const lowRiskPlan: ActionPlan = {
    incidentId: 'test-inc-03',
    diagnosis: 'Transient deadlock',
    confidence: 0.9,
    rootCause: 'Deadlock',
    evidence: ['Deadlock in logs'],
    actions: [
      {
        type: 'RESTART_POD',
        target: 'worker-pod-01',
        namespace: 'default',
        parameters: {},
        riskLevel: 'LOW',
        requiresApproval: false,
        estimatedRecoveryTimeSec: 10,
      },
    ],
    rollbackPlan: [],
    reasoningSummary: 'Test plan',
  };

  const eval3 = PolicySafetyAgent.evaluatePlan(lowRiskPlan);
  assert(eval3.allowed, 'Low risk action should be allowed');
  assert(eval3.requiresApproval, 'Level 1 Recommend must require human approval even for low risk');
  console.log('  ✅ Test 3 Passed: Autonomy Level 1 correctly requires human approval.');

  // Reset to default
  PolicySafetyAgent.setAutonomyLevel(AutonomyLevel.LEVEL_3_AUTO_MEDIUM);
  PolicySafetyAgent.clearCooldown('coredns-77884');
  PolicySafetyAgent.clearCooldown('payment-service');
  PolicySafetyAgent.clearCooldown('worker-pod-01');

  console.log('🎉 All Policy Safety Agent Tests Passed successfully!\n');
}

runPolicyTests().catch((err) => {
  console.error('❌ Policy Test Suite Failed:', err);
  process.exit(1);
});
