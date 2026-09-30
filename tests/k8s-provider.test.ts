import { k8sProvider } from '../src/kubernetes/provider.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runK8sProviderTests() {
  console.log('🧪 Starting Kubernetes Provider Test Suite...');

  // Test 1: Cluster Discovery
  const cluster = await k8sProvider.getClusterInfo();
  assert(Boolean(cluster.name), 'Cluster name must exist');
  assert(cluster.immunityScore >= 0 && cluster.immunityScore <= 100, 'Immunity score must be in range 0-100');
  console.log(`  ✅ Test 1 Passed: Discovered cluster ${cluster.name} (Immunity Score: ${cluster.immunityScore}%)`);

  // Test 2: Node Listing
  const nodes = await k8sProvider.listNodes();
  assert(nodes.length > 0, 'Cluster must have at least one node');
  assert(Boolean(nodes[0].name), 'Node name must be populated');
  console.log(`  ✅ Test 2 Passed: Discovered ${nodes.length} cluster nodes.`);

  // Test 3: Pod Discovery
  const pods = await k8sProvider.listPods();
  assert(pods.length > 0, 'Cluster must have pods');
  assert(pods.some((p) => p.restartCount >= 0), 'Pods must provide restart count metrics');
  console.log(`  ✅ Test 3 Passed: Discovered ${pods.length} workloads across namespaces.`);

  // Test 4: Pod Restart Operation
  const restartRes = await k8sProvider.restartPod('core-services', 'bio-auth-service-784f9');
  assert(restartRes.success, 'Pod restart operation must succeed');
  assert(restartRes.actionType === 'RESTART_POD', 'Action type must match');
  console.log(`  ✅ Test 4 Passed: Pod restart operation verified.`);

  // Test 5: Deployment Scale Operation
  const scaleRes = await k8sProvider.scaleDeployment('immune-core', 'telemetry-engine', 4);
  assert(scaleRes.success, 'Deployment scale operation must succeed');
  assert(scaleRes.actionType === 'SCALE_DEPLOYMENT', 'Action type must match');
  console.log(`  ✅ Test 5 Passed: Deployment scale operation verified.`);

  // Test 6: Node Cordon Operation
  const cordonRes = await k8sProvider.cordonNode('node-beta-02');
  assert(cordonRes.success, 'Node cordon operation must succeed');
  console.log(`  ✅ Test 6 Passed: Node cordon operation verified.`);

  // Test 7: Pod Quarantine Operation
  const quarantineRes = await k8sProvider.quarantinePod('immune-core', 'telemetry-engine-998db');
  assert(quarantineRes.success, 'Pod quarantine operation must succeed');
  console.log(`  ✅ Test 7 Passed: Pod quarantine operation verified.`);

  console.log('🎉 All Kubernetes Provider Tests Passed successfully!\n');
}

runK8sProviderTests().catch((err) => {
  console.error('❌ K8s Provider Test Suite Failed:', err);
  process.exit(1);
});
