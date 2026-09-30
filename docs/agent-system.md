# BioPods Multi-Agent System Specification

BioPods implements an eight-agent autonomic immune architecture where each agent has strict boundaries of responsibility.

---

## Agent Inventory & Responsibilities

### 1. Dendritic Detection Agent (`Dendritic-Detector-01`)
- **Role**: Peripheral Surveillance & Signal Correlation.
- **Inputs**: Pod CPU/Memory, container restart counts, PVC storage latency, and Kubernetes `Warning` events.
- **Biological Logic**: Computes an anomaly score using weighted PAMPs (Pathogen-Associated Molecular Patterns) and Danger Signals.
- **Output**: Generates candidate `IncidentRecord` when the anomaly score exceeds 60/100.
- **Boundary**: Does **NOT** diagnose root causes and does **NOT** execute remediations.

### 2. T-Cell Diagnostic Agent (`TCell-Guardian-03`)
- **Role**: Deep Investigation & Root Cause Synthesis.
- **Inputs**: Real container exit codes, termination reasons, tail logs, recent K8s events, and historical B-Cell memories.
- **Output**: Synthesizes a grounded diagnosis referencing concrete cluster evidence (e.g. OOMKill exit code 137, CrashLoopBackOff deadlock).
- **Boundary**: Formulates hypotheses and candidate strategies; does **NOT** build deployment patch specifications.

### 3. B-Cell Memory Agent (`BCell-Learner-09`)
- **Role**: Adaptive Threat Memory & Antibody Repertoire.
- **Logic**: Performs cosine similarity search across vector representations of threat signatures to recall: *"Have we seen this failure pattern before, and what worked?"*
- **Output**: Returns historical memory cells with affinity scores and verified parameters.

### 4. Planning Agent (`Planning-Engine-02`)
- **Role**: Remediation Plan Synthesis & Rollback Definition.
- **Output**: Produces a structured `ActionPlan` validated strictly against the `ActionPlanSchema` (Zod).
- **Features**: Includes rollback action definitions and initial risk level classification.

### 5. Policy / Safety Guard (`Policy-Safety-Guard-01`)
- **Role**: Mandatory Governance & Blast Radius Gate.
- **Guards**:
  - Namespace protections (`kube-system`, `kube-public`, `kube-node-lease`).
  - Replica ceilings (maximum 8 replicas per deployment).
  - Cooldown periods (15 seconds minimum per target resource to prevent thrashing).
  - Autonomy levels (Levels 0 through 4) to require human approval for high/critical actions.

### 6. Healing Executor (`Healing-Executor-01`)
- **Role**: Controlled Kubernetes API Dispatcher.
- **Boundary**: Does **NOT** reason or decide. Takes authorized plans and issues Kubernetes API patches.

### 7. Verification Agent (`Verification-Agent-01`)
- **Role**: Post-Remediation Reality Check.
- **Logic**: Polls target pod readiness, container exit codes, and CPU/memory stabilization.
- **Output**: Confirms whether the system has truly returned to optimal operation.

### 8. Learning Agent (`Learning-Engine-01`)
- **Role**: Evolutionary Strategy Reinforcement.
- **Logic**: Increases strategy affinity (+3) on verified success; penalizes confidence (-10) on failure, registering memory updates.
