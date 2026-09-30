# Kubernetes Integration Guide

BioPods operates natively against standard Kubernetes clusters (v1.26 to v1.32+) using the official `@kubernetes/client-node` SDK.

---

## 1. Supported Environments

- **Local Clusters**: Minikube, Kind, Docker Desktop Kubernetes, K3s.
- **Managed Cloud Providers**: AWS EKS, Google GKE, Azure AKS.
- **On-Premises Bare Metal**: kubeadm-provisioned clusters.

---

## 2. Cluster Discovery & Operations

The `KubernetesProvider` abstraction maps cluster infrastructure directly into biological entities:

| Kubernetes Concept | BioPods Representation | Monitored Attributes |
| :--- | :--- | :--- |
| **Node** | Biological Sector | Ready status, schedulability, CPU/memory capacity |
| **Pod** | Biological Cell / Host | Container status, restart count, CPU/mem, PVC latency |
| **Deployment** | Colony / Organ System | Desired vs available replicas, rollout condition |
| **Warning Event** | Antigen Signal | Reason, involved object, recurrence frequency |
| **NetworkPolicy** | Quarantine Membrane | Egress / ingress isolation barrier |

---

## 3. RBAC Configuration

Deploy the provided least-privilege RBAC manifest:

```bash
kubectl apply -f k8s/biopods-rbac.yaml
```

This creates:
- `biopods-system` namespace.
- `biopods-controller` ServiceAccount.
- `biopods-operator-role` ClusterRole granting pod recycling, deployment scaling, and node cordoning permissions.

---

## 4. Local Deployment with Kind

To spin up a local test cluster and deploy BioPods:

```bash
# 1. Create a Kind cluster
kind create cluster --name biopods-cluster

# 2. Deploy RBAC and Chaos Workloads
kubectl apply -f k8s/biopods-rbac.yaml
kubectl apply -f k8s/chaos-workloads.yaml

# 3. Verify workloads are running
kubectl get pods -A

# 4. Start BioPods locally (connects automatically via ~/.kube/config)
npm run dev
```

---

## 5. Cordoning & Pod Quarantine Operations

- **Pod Quarantine**: Applies the label `biopods.io/quarantine: isolated` to the target pod, restricting network access through matching NetworkPolicies.
- **Node Cordoning**: Issues patch `spec.unschedulable = true` to prevent new pods from being scheduled on a degraded node while ongoing workloads are safely migrated.
