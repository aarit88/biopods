# BioPods Architectural Specification

## 1. System Overview

BioPods is an **Agentic AI Self-Healing Kubernetes Orchestration Platform** modeled on the human biological immune system. It continuously executes an 8-stage autonomic loop:

```
OBSERVE ──▶ DETECT ──▶ DIAGNOSE ──▶ REASON ──▶ PLAN ──▶ SAFETY CHECK ──▶ EXECUTE ──▶ VERIFY ──▶ LEARN
```

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BioPods Command Center (UI)                           │
│     React 19 • Tailwind CSS v4 • Three.js 3D Visualizer • D3 Neural Mesh    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSockets (Port 3000)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    BioPods Autonomous Kernel (Express)                      │
│                                                                             │
│  ┌─────────────────────────┐              ┌──────────────────────────────┐  │
│  │     Incident Engine     │              │    Conflict Prevention       │  │
│  │  Lifecycle State Machine│              │   Distributed Resource Locks │  │
│  └────────────┬────────────┘              └──────────────┬───────────────┘  │
│               │                                          │                  │
│  ┌────────────▼──────────────────────────────────────────▼───────────────┐  │
│  │                    Multi-Agent Immune Repertoire                      │  │
│  │  • Dendritic Detection Agent    • Planning Agent                      │  │
│  │  • T-Cell Diagnostic Agent      • Policy / Safety Guard               │  │
│  │  • B-Cell Memory Agent          • Healing Executor                    │  │
│  │  • Learning Agent               • Verification Agent                  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │                     Kubernetes Provider Abstraction                   │  │
│  │  • Cluster Discovery             • Pod Recycling & Logs Inspection    │  │
│  │  • Deployment Rollouts & Scale   • Node Cordoning & Isolation Policy  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ Real K8s API / In-Cluster SA
┌──────────────────────────────────────▼──────────────────────────────────────┐
│            Kubernetes Cluster (Minikube / Kind / EKS / GKE / AKS)           │
│     Nodes • Pods • Deployments • ReplicaSets • Events • NetworkPolicies     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Principles

1. **Safety First**: The LLM is never allowed to directly execute raw shell commands or raw `kubectl` invocations. Every remediation action must be represented as a structured, schema-validated action plan that passes through the Policy Safety Gate before reaching the Kubernetes API.
2. **Dual-Mode Connectivity**: BioPods dynamically connects to live Kubernetes clusters using in-cluster ServiceAccount credentials or local `~/.kube/config`. When no cluster context is active, it seamlessly operates via an intelligent local simulation engine.
3. **Verifiable Healing**: Actions are never assumed to succeed simply because the Kubernetes API accepted an HTTP patch. The Verification Agent actively polls container readiness, exit codes, and metrics stabilization over a verification window.
4. **Self-Reinforcing Memory**: Every verified recovery updates the B-Cell vector memory repertoire, boosting confidence in proven strategies and dampening ineffective approaches.
