# 🧬 BioPods: Autonomous Cluster Immunity System

Follow these instructions to initialize the BioPods neural core and launch the command center.

## 📋 Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher

---

## 🚀 Quick Start Guide

### 1. Initialize the Neural Backend
The backend manages the NATS signaling and cluster telemetry simulation.

```bash
# Navigate to the backend directory
cd backend

# Install neural dependencies
npm install

# Start the API Gateway & Signal Core
npm run dev
```
*The backend will be live at `http://localhost:3001`*

### 2. Launch the Command Center (Frontend)
The frontend provides the 3D visualization and autonomous control interface.

```bash
# Navigate to the frontend directory
cd frontend

# Install UI dependencies
npm install

# Launch the development server
npm run dev
```
*The dashboard will be available at `http://localhost:5175`*

---

## 🌐 Accessing the Platform
Once both services are running, open your browser and navigate to:
**[http://localhost:5175](http://localhost:5175)**

### 🔑 Demo Credentials
The platform is pre-configured with a "Bio-Sync" auto-login for demonstration purposes. 
If prompted, use:
- **Email**: `admin@biopods.io`
- **Password**: `password`

---

## 🛠️ Troubleshooting
- **Port Conflicts**: Ensure ports `3001` (Backend) and `5175` (Frontend) are available.
- **Neural Link**: If "LIVE TELEMETRY" shows as disconnected, ensure the backend is running before refreshing the frontend.
- **Vite Cache**: If the UI looks inconsistent, try `npm run dev -- --force`.

---
*Powered by BioPods Autonomous Immunity Engine v4.2*
