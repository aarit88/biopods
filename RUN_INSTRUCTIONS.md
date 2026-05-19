# 🧬 BioPods: Autonomic Micro-Systems Orchestration

## ABB Accelerator Hackathon Demo

Follow these instructions to launch the full Bio Pods autonomic immune system demonstration.

## 📋 Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher (with virtual environment at `.venv/`)
- **Ollama**: Running locally at `http://localhost:11434` with `llama3` model pulled

---

## 🚀 Quick Start (Single Command)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Python Agent Dependencies
```bash
cd ..
.venv\Scripts\pip install -r backend\requirements.txt
```

### 3. Initialize the Database
```bash
cd backend
npm run db:push
npm run db:seed
```

### 4. Install Frontend Dependencies
```bash
cd ..\frontend
npm install
```

### 5. Launch the Full Autonomic Demo
Open **two terminals**:

**Terminal 1 — Backend + Python Agent:**
```bash
cd backend
npm run demo
```
This starts concurrently:
- **TypeScript Gateway** (port 5000) — Patrol Routine & Cytokine Bus
- **Visualization Hub** (port 3001) — Socket.io Real-Time Events
- **Python Patrol Agent** (port 8001) — Ollama T-Cell Reasoner

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🌐 Accessing the Platform
Once all services are running, open your browser and navigate to:
**[http://localhost:5173](http://localhost:5173)**

### 🔑 Demo Credentials
- **Email**: `admin@biopods.io`
- **Password**: `password`

---

## 🏗️ System Architecture

```
                   ┌─────────────────────────────┐
                   │  Frontend Dashboard (:5173) │
                   └──────────────┬──────────────┘
                                  │ (REST / WebSockets)
                                  ▼
                   ┌─────────────────────────────┐
                   │  TypeScript Gateway (:5000) │
                   └──────────────┬──────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
     ┌────────────────────────┐       ┌────────────────────────┐
     │  Cytokine Bus (HTTP)   │       │   Ollama Local LLMs    │
     │  via Visualization Hub │       │ (Llama3 / Phi3)        │
     └────────────┬───────────┘       └───────────▲────────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                   ┌─────────────────────────────┐
                   │  Python Patrol Agent (:8001)│
                   │  T-Cell Ollama Reasoner     │
                   └─────────────────────────────┘
```

## 🎯 Demo Walkthrough
1. Navigate to **Immune Response** (Threats page)
2. Click **"INJECT THERMAL SURGE"** or **"INJECT DDOS SPIKE"**
3. Watch the **Cytokine Bus** detect the anomaly in the Gateway logs
4. Observe the **Python T-Cell Agent** invoke Ollama for reasoning
5. See the **AI Reasoning Terminal** display the live mitigation plan
6. The threat appears in the **Immune Response Table** with severity label

---

## 🛠️ Troubleshooting
- **Port Conflicts**: Ensure ports `3001`, `5000`, `5173`, `8001` are available
- **Ollama Not Running**: The T-Cell agent falls back to deterministic mitigation if Ollama is offline
- **Python Encoding**: If you see `UnicodeEncodeError`, set `PYTHONIOENCODING=utf-8` before running
- **Neural Link Offline**: Ensure the backend demo is running before refreshing the frontend

---
*Powered by BioPods Autonomic Immunity Engine — ABB Accelerator 2026*
