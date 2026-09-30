import { DendriticDetectionAgent } from '../src/agents/dendritic-agent.ts';
import { TCellDiagnosticAgent } from '../src/agents/diagnostic-agent.ts';
import { PlanningAgent } from '../src/agents/planning-agent.ts';
import { PolicySafetyAgent } from '../src/agents/policy-agent.ts';
import { HealingExecutorAgent } from '../src/agents/healing-executor.ts';
import { VerificationAgent } from '../src/agents/verification-agent.ts';
import { LearningAgent } from '../src/agents/learning-agent.ts';
import { ConflictPreventionEngine } from '../src/incidents/incident-engine.ts';
import { IncidentStatus } from '../src/agents/types.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runPipelineTests() {
  console.log('🧪 Starting End-to-End Multi-Agent Pipeline Test Suite...');

  // 1. Detection Phase
  const mockUnhealthyPod = {
    name: 'telemetry-engine-998db',
    namespace: 'immune-core',
    status: 'CrashLoopBackOff',
    restartCount: 8,
    cpuUsagePercent: 92,
    memoryUsagePercent: 95,
    pvcLatencyMs: 38,
  };
  const mockEvents = [
    {
      involvedObject: { name: 'telemetry-engine-998db' },
      type: 'Warning',
      reason: 'BackOff',
      message: 'Back-off restarting failed container',
    },
  ];

  const candidate = DendriticDetectionAgent.evaluatePod(mockUnhealthyPod, mockEvents);
  assert(candidate !== null, 'Dendritic agent must detect anomaly on unhealthy pod');
  assert(candidate!.anomalyScore >= 60, 'Anomaly score must exceed detection threshold');
  assert(candidate!.status === IncidentStatus.DETECTED, 'Candidate initial status must be DETECTED');
  console.log(`  ✅ Phase 1 Detection Passed: Candidate ${candidate!.id} identified (Score: ${candidate!.anomalyScore})`);

  // 2. Conflict Prevention Lock
  const resourceKey = `${candidate!.namespace}/${candidate!.targetResource}`;
  assert(ConflictPreventionEngine.acquireLock(resourceKey), 'First lock acquisition must succeed');
  assert(!ConflictPreventionEngine.acquireLock(resourceKey), 'Concurrent lock acquisition must be rejected');
  ConflictPreventionEngine.releaseLock(resourceKey);
  console.log('  ✅ Concurrency Lock Passed: Prevents concurrent race conditions.');

  // 3. Diagnosis Phase
  const diagnosis = await TCellDiagnosticAgent.diagnose(candidate!);
  assert(diagnosis.confidence >= 0.7, 'Diagnosis confidence must be high');
  assert(diagnosis.evidence.length > 0, 'Diagnosis must include concrete cluster evidence');
  assert(typeof diagnosis.rootCause === 'string', 'Root cause must be identified');
  console.log(`  ✅ Phase 2 Diagnosis Passed: Root Cause: "${diagnosis.rootCause}"`);

  // 4. Planning Phase
  const plan = await PlanningAgent.createPlan(candidate!, diagnosis);
  assert(plan.actions.length > 0, 'Plan must contain at least one remediation action');
  assert(plan.rollbackPlan !== undefined, 'Plan must contain rollback definition');
  console.log(`  ✅ Phase 3 Planning Passed: Strategy: ${plan.actions[0].type} on ${plan.actions[0].target}`);

  // 5. Policy Phase
  const policyCheck = PolicySafetyAgent.evaluatePlan(plan);
  assert(policyCheck.allowed, 'Policy must allow valid self-healing strategy');
  console.log(`  ✅ Phase 4 Safety Policy Passed: Allowed: ${policyCheck.allowed}, Risk: ${policyCheck.riskAssessment.overallRisk}`);

  // 6. Execution Phase
  const results = await HealingExecutorAgent.executePlan(plan);
  assert(results.length > 0, 'Executor must execute planned actions');
  assert(results[0].success, 'Execution must succeed');
  console.log(`  ✅ Phase 5 Execution Passed: Result: ${results[0].details}`);

  // 7. Verification Phase
  const verification = await VerificationAgent.verifyRemediation(candidate!);
  assert(typeof verification.isResolved === 'boolean', 'Verification must determine resolution status');
  console.log(`  ✅ Phase 6 Verification Passed: Resolved: ${verification.isResolved}`);

  // 8. Learning Phase
  await LearningAgent.processOutcome(candidate!, verification);
  console.log('  ✅ Phase 7 Learning Passed: Memory reinforced and audit updated.');

  console.log('🎉 Full Multi-Agent Self-Healing Pipeline Test Suite Passed successfully!\n');
}

runPipelineTests().catch((err) => {
  console.error('❌ Pipeline Test Suite Failed:', err);
  process.exit(1);
});
