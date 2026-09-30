# BioPods Architecture Audit & Migration Plan

## 1. Executive Summary

BioPods was initiated as an autonomic, bio-inspired immune system for Kubernetes clusters. While the visual layer (frontend dashboard, Three.js 3D visualizer, D3 topology map, event log) is remarkably rich and responsive, the core backend infrastructure previously operated largely on simulated in-memory state, uncoordinated Python microservices, and placeholder healing routines.

This plan details the architectural refactoring to transform BioPods into a **production-oriented, end-to-end Agentic AI Self-Healing Kubernetes Orchestration Platform**.

---

## 2. Current State vs. Target Architecture

| Component | Hackathon / Prototype State | Target Production Architecture |
| :--- | :--- | :--- |
| **Kubernetes Integration** | Static hardcoded arrays; disconnected stubs | Real `KubernetesProvider` using `@kubernetes/client-node` with discovery of clusters, namespaces, nodes, pods, deployments, PVCs, events, and metrics; dual-mode (live cluster + resilient fallback) |
| **Healing Execution** | Simulated state changes (`SUCCESS_SIMULATED`) | Real K8s operations: pod delete/restart, deployment scale/restart/rollback, node cordon/uncordon, pod quarantine network policies |
| **Safety & Policy** | Basic namespace blocklist without formal checks | Mandatory multi-stage safety pipeline: Schema validation -> Policy Engine -> Blast Radius analysis -> Autonomy level checks (Levels 0–4) -> Human Approval Queue |
| **AI / Agentic Flow** | Scripted JSON / prompt without tool-calling or validation | Multi-Agent Architecture: Dendritic (Detection) -> T-Cell (Diagnostic) -> B-Cell (Memory) -> Planning -> Safety/Policy -> Executor -> Verification -> Learning |
| **Incident Lifecycle** | Ephemeral danger events without state transitions | Formal lifecycle state machine: `DETECTED` → `TRIAGING` → `DIAGNOSING` → `PLANNING` → `WAITING_FOR_APPROVAL` → `EXECUTING` → `VERIFYING` → `RESOLVED` / `FAILED` |
| **Verification Loop** | Absent; assumed instant recovery | Active multi-stage verifier polling pod readiness, container exit codes, restart delta, and metrics stabilization |
| **Conflict Prevention** | Incomplete static set | Distributed resource locking, action deduplication, incident correlation, and per-resource cooldown windows |
| **Authentication & RBAC** | Hardcoded demo bypass | Real JWT authentication, password hashing, and role-based permissions (`ADMIN`, `OPERATOR`, `OBSERVER`) |
| **Workloads & Chaos** | Synthetic data generation | Real Kubernetes manifests with 5 reproducible failure workloads (CrashLoop, OOMKill, CPU Spike, Probe Failure, Scheduling Hang) |

---

## 3. Multi-Agent Engine Specification

```
   [Cluster Telemetry & K8s Events]
                 │
                 ▼
     [Dendritic Detection Agent] ──▶ Anomaly Detected?
                 │                         │ YES
                 ▼                         ▼
         [Incident Engine] ◀── [Create Structured Incident]
                 │
                 ▼
     [Diagnostic / T-Cell Agent] ──▶ Gathers Pod Logs, K8s Events, Metrics
                 │
                 ├──▶ [B-Cell Memory Agent] (Vector Memory Retrieval)
                 ▼
          [Planning Agent] ──▶ Formulates Structured Action Plan & Rollback
                 │
                 ▼
       [Safety / Policy Agent] ──▶ Checks Blast Radius, Namespaces, Autonomy Level
                 │
                 ├── [High Risk / Level < 4] ──▶ [Waiting for Human Approval]
                 ▼ [Approved / Low Risk]
       [Healing Executor Agent] ──▶ Dispatches Real Kubernetes API Patch
                 │
                 ▼
       [Verification Agent] ──▶ Polls K8s Status, Readiness, Restart Counts
                 │
                 ├── SUCCESS ──▶ [Learning Agent] (Store Memory, Boost Affinity)
                 └── FAILURE ──▶ [Rollback Execution & Escalation]
```

---

## 4. Phased Implementation Roadmap

1. **Phase 2: Core Abstraction Layer**
   - Implement `KubernetesProvider` for dynamic cluster connectivity, resource discovery, and real operations.
   - Implement telemetry provider bridging Prometheus, Metrics Server, and K8s Metrics.
2. **Phase 3: Agent Runtime & Safety Engine**
   - Build Dendritic, T-Cell, B-Cell, Planner, Policy, Executor, Verifier, and Learner agents.
   - Build the JSON Schema validation and Blast Radius calculator.
3. **Phase 4: Real Kubernetes Operations & Incident Engine**
   - Real pod restart, deployment scale/restart/rollback, and node cordon routines with automatic verification and rollback.
   - Build incident state machine with human approval queue.
4. **Phase 5: Security & RBAC**
   - Secure authentication, permission checks, and auditing.
5. **Phase 6: UI & Real-Time Sync**
   - Bind dashboard and control centers to the real engine via Socket.IO.
6. **Phase 7: Packaging, Chaos Manifests & Tests**
   - Create K8s manifests, chaos workloads, and comprehensive automated test suite.
