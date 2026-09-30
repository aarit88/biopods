# Chaos Engineering & Failure Scenarios

BioPods includes five pre-configured Kubernetes failure workloads designed to evaluate autonomous detection, reasoning, and recovery.

---

## 1. Deploying Chaos Scenarios

Apply the chaos manifest to your cluster:

```bash
kubectl apply -f k8s/chaos-workloads.yaml
```

---

## 2. Failure Scenarios Overview

### Scenario 1: CrashLoopBackOff Anomaly (`crashloop-tester`)
- **Namespace**: `immune-core`
- **Failure Mode**: Process enters startup deadlock and exits with code 1 after 5 seconds.
- **BioPods Response**:
  1. Dendritic agent detects rapid restart delta and warning `BackOff` event.
  2. T-Cell agent correlates exit code 1 with container lifecycle state.
  3. Planner schedules pod recycle with grace period.
  4. Verifier monitors subsequent startup stability.

### Scenario 2: OOMKill Heap Leak (`oom-tester`)
- **Namespace**: `immune-core`
- **Failure Mode**: Process rapidly reads `/dev/zero`, triggering Linux kernel OOMKiller (Exit 137).
- **BioPods Response**:
  1. Dendritic agent detects OOMKilling kernel event.
  2. B-Cell memory recalls vector `oom-memory-exhaustion-exit-137`.
  3. Planner executes horizontal deployment scaling to distribute workload.
  4. Verifier checks memory stabilization.

### Scenario 3: CPU Saturation Anomaly (`cpu-burner`)
- **Namespace**: `industrial-scada`
- **Failure Mode**: Unbounded loop saturates 100% CPU.
- **BioPods Response**:
  1. Dendritic agent flags CPU saturation >85%.
  2. Planner scales deployment replicas.
  3. Aggregate CPU per pod drops below threshold.

### Scenario 4: Failed Readiness Probe (`probe-failure-tester`)
- **Namespace**: `industrial-scada`
- **Failure Mode**: Probe queries `/non-existent-health-check` on port 80.
- **BioPods Response**:
  1. Dendritic agent flags unready condition while pod is in Running phase.
  2. T-Cell agent isolates unhealthy pod from service routing mesh.

### Scenario 5: Unschedulable Pending Pod (`pending-unschedulable-tester`)
- **Namespace**: `immune-core`
- **Failure Mode**: Demands impossible node selector `disktype: biological-quantum-nvme`.
- **BioPods Response**:
  1. Dendritic agent flags prolonged Pending state without scheduled node.
  2. Operator is notified with recommendation to adjust node affinities.
