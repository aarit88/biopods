import asyncio
import json
import os
import math
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from nats.aio.client import Client as NATS
from dotenv import load_dotenv

load_dotenv()

# NATS client must be created before the lifespan so it is accessible
# both in the startup block and throughout the module.
nc = NATS()

# Redis Configuration (Optional Fallback)
redis_client = None
try:
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)
    print(f"🧬 [Dendritic Cell] Connected to Redis for Stream support at {redis_url}")
except Exception as e:
    print(f"⚠️ [Dendritic Cell] Redis connection skipped (running in local stream mock): {e}")

# ── Dynamic Baseline Store ──
# Structure: { pod_id: { cpu: [], memory: [], pvc_latency: [], disk_io: [], network_spike: [] } }
METRIC_WINDOWS: Dict[str, Dict[str, List[float]]] = {}
WINDOW_SIZE = 20  # Sliding window of 20 telemetry ticks for moving average

# Signal Weights for DCA (Biologically grounded)
W_PAMP = 2.0      # High weight for clear pathogen/restart patterns
W_DANGER = 1.0    # Moderately high for resource strain
W_SAFE = -1.5     # Negative weight to suppress mature DC state when healthy


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Modern FastAPI lifespan handler (replaces deprecated @on_event)."""
    nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
    try:
        await nc.connect(nats_url, connect_timeout=3)
        print(f"🧬 [Dendritic Cell] Neural Bus Connected: NATS at {nats_url}")
        # Subscribe to raw telemetry stream
        await nc.subscribe("telemetry.raw", cb=process_telemetry)
    except Exception as e:
        print(f"⚠️ [Dendritic Cell] NATS connection failed: {e}. Running in LOCAL HTTP/MOCK BRIDGE.")
        application.state.mock_mode = True

    yield  # ── application runs ──

    # Graceful shutdown: drain NATS connection
    if nc.is_connected:
        await nc.drain()


app = FastAPI(title="BioPods True Dendritic Cell Agent", lifespan=lifespan)

async def process_telemetry(msg):
    try:
        data = json.loads(msg.data.decode())
        await analyze_and_publish(data)
    except Exception as e:
        print(f"❌ Error processing telemetry payload: {e}")

def update_baselines(pod_id: str, metrics: dict) -> Dict[str, float]:
    """Updates the moving average windows and returns baseline averages."""
    if pod_id not in METRIC_WINDOWS:
        METRIC_WINDOWS[pod_id] = {
            "cpu": [], "memory": [], "pvc_latency": [], "disk_io": [], "network_in": []
        }
        
    windows = METRIC_WINDOWS[pod_id]
    baselines = {}
    
    for metric_name, val in metrics.items():
        if metric_name in windows:
            windows[metric_name].append(float(val))
            if len(windows[metric_name]) > WINDOW_SIZE:
                windows[metric_name].pop(0)
            # Calculate rolling mean
            baselines[metric_name] = sum(windows[metric_name]) / len(windows[metric_name])
        else:
            baselines[metric_name] = float(val)
            
    return baselines

async def analyze_and_publish(data: dict):
    pod_id = data.get("podId")
    pod_name = data.get("podName", pod_id)
    metrics = data.get("metrics", {})
    
    if not pod_id:
        return

    # Extract dynamic inputs
    cpu = float(metrics.get("cpu", 0.0))
    memory = float(metrics.get("memory", 0.0))
    disk_io = float(metrics.get("disk_io", 0.0))
    network_in = float(metrics.get("network_in", 0.0))
    pvc_latency = float(metrics.get("pvc_latency", 0.0))
    restart_count = float(metrics.get("restart_count", 0.0))
    
    # Update and fetch moving average baselines
    baselines = update_baselines(pod_id, {
        "cpu": cpu, "memory": memory, "pvc_latency": pvc_latency, 
        "disk_io": disk_io, "network_in": network_in
    })
    
    # ── Biologically-Inspired Signal Extraction ──
    # 1. PAMP (Pathogen-Associated Molecular Patterns)
    # Absolute indicators of critical faults/pathogenic behaviors.
    pamp_signal = 0.0
    pamp_triggers = []
    
    if restart_count > 0:
        pamp_signal += min(1.0, restart_count * 0.5)
        pamp_triggers.append(f"RESTART_COUNT_SPIKE({restart_count})")
    
    # Massive network spike (more than 3x baseline)
    net_baseline = baselines.get("network_in", 50.0)
    if net_baseline > 0 and network_in > (net_baseline * 3.0):
        pamp_signal += 0.6
        pamp_triggers.append("ANOMALOUS_NETWORK_BURST")
        
    # 2. Danger Signals (DS)
    # Signs of cellular/pod stress, resource saturation, latency issues.
    ds_signal = 0.0
    ds_triggers = []
    
    cpu_baseline = baselines.get("cpu", 50.0)
    mem_baseline = baselines.get("memory", 50.0)
    latency_baseline = baselines.get("pvc_latency", 10.0)
    
    if cpu > 80.0 or cpu > (cpu_baseline * 1.5):
        ds_signal += 0.4
        ds_triggers.append(f"CPU_STRESS({cpu}%)")
    if memory > 90.0 or memory > (mem_baseline * 1.3):
        ds_signal += 0.5
        ds_triggers.append(f"MEMORY_SATURATION({memory}%)")
    if pvc_latency > 50.0 or pvc_latency > (latency_baseline * 2.0):
        ds_signal += 0.3
        ds_triggers.append(f"PVC_LATENCY_LAG({pvc_latency}ms)")
        
    # 3. Safe Signals (SS)
    # Metabolic indicators that suppress the immune response.
    ss_signal = 0.0
    if cpu < 50.0 and memory < 75.0 and restart_count == 0:
        ss_signal = 1.0 - (max(cpu/100.0, memory/100.0))
        
    # ── Weighted Signal Fusion (Dendritic Cell Integration) ──
    # Semi-mature DC concentration (smDC) -> indicates SAFE conditions
    c_smdc = (ss_signal * W_SAFE) + (ds_signal * W_DANGER) + (pamp_signal * W_PAMP)
    
    # Mature DC concentration (mDC) -> indicates PATHOGENIC danger
    c_mdc = (pamp_signal * W_PAMP) + (ds_signal * W_DANGER)
    
    # Calculate Adaptive Danger Score (0 - 100)
    total_concentration = abs(c_smdc) + abs(c_mdc)
    if total_concentration > 0:
        # Sigmoid or ratio-based normalization
        danger_score = (c_mdc / total_concentration) * 100.0
    else:
        danger_score = 0.0
        
    # Apply dynamic multiplier for rapid escalation
    if restart_count > 0:
        danger_score = max(danger_score, 70.0 + (restart_count * 5.0))
    danger_score = min(100.0, max(0.0, danger_score))
    
    # ── Determine Contextual State ──
    if danger_score >= 85.0:
        label = "CRITICAL"
    elif danger_score >= 65.0:
        label = "DANGER"
    elif danger_score >= 35.0:
        label = "WARNING"
    else:
        label = "SAFE"
        
    # ── Confidence Score Calculation ──
    # High confidence if we have lots of history (stable baseline) or high severity indicators
    sample_count = len(METRIC_WINDOWS[pod_id]["cpu"])
    history_confidence = min(1.0, sample_count / WINDOW_SIZE)
    severity_confidence = 1.0 if (pamp_signal > 0.5 or ds_signal > 0.8) else 0.7
    confidence_score = min(1.0, (history_confidence * 0.4) + (severity_confidence * 0.6))
    
    # Build complete Dendritic Cell Anomaly Event
    danger_event = {
        "podId": pod_id,
        "podName": pod_name,
        "score": round(danger_score, 2),
        "label": label,
        "type": "Dendritic Signal Fusion",
        "details": f"Biological signal integration: PAMP={pamp_signal:.2f}, Danger={ds_signal:.2f}, Safe={ss_signal:.2f}",
        "triggeringSignals": pamp_triggers + ds_triggers,
        "confidence": round(confidence_score * 100, 2),
        "metricsSummary": {
            "cpu": cpu,
            "memory": memory,
            "pvcLatency": pvc_latency,
            "restarts": restart_count
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    # ── Publish and Propagate ──
    # Publish to NATS
    if not getattr(app.state, "mock_mode", False):
        try:
            await nc.publish("danger.score", json.dumps(danger_event).encode())
            if label in ["DANGER", "CRITICAL"]:
                await nc.publish("danger.detected", json.dumps(danger_event).encode())
            print(f"🧬 [Dendritic] {pod_name}: Score {danger_score:.1f}% ({label}) - Published to NATS")
        except Exception as e:
            print(f"❌ NATS Publish failed: {e}")
            
    # Publish to Redis Stream (if configured)
    if redis_client:
        try:
            redis_client.xadd("stream:telemetry:danger", {"pod_id": pod_id, "payload": json.dumps(danger_event)})
        except Exception as e:
            pass
            
    # Cross-process fallback posting to visualization-hub
    try:
        import urllib.request
        url = "http://localhost:3001/api/events"
        payload = json.dumps({"subject": "danger.score", "data": danger_event}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        # Perform asynchronous call via thread pool to keep loop non-blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=1).read())
    except Exception as e:
        # Silent fallback
        pass

@app.post("/events")
async def handle_remote_event(event: dict):
    subject = event.get("subject")
    data = event.get("data")
    if subject == "telemetry.raw":
        if not isinstance(data, dict):
            raise HTTPException(status_code=422, detail="Event `data` field must be a JSON object.")
        await analyze_and_publish(data)
    return {"status": "ACK"}

@app.get("/health")
async def health():
    return {
        "status": "Dendritic Signal Fusion Optimal",
        "nats_connected": nc.is_connected,
        "tracked_pods_count": len(METRIC_WINDOWS)
    }

if __name__ == "__main__":
    import uvicorn
    # Dendritic Cell service runs on 8003 to prevent conflict with 8001 (Patrol T-Cell)
    print("🧬 True Dendritic Cell Signal Fusion Agent bootstrapping on port 8003...")
    uvicorn.run(app, host="0.0.0.0", port=8003)
