import asyncio
import json
import os
from fastapi import FastAPI
from nats.aio.client import Client as NATS
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="BioPods Dendritic Agent")
nc = NATS()

# Danger calculation constants
CPU_THRESHOLD = 80.0
MEM_THRESHOLD = 90.0

@app.on_event("startup")
async def startup_event():
    nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
    try:
        await nc.connect(nats_url, timeout=2)
        print(f"Dendritic Agent connected to NATS at {nats_url}")
        # Subscribe to telemetry.raw
        await nc.subscribe("telemetry.raw", cb=process_telemetry)
    except Exception as e:
        print(f"NATS connection failed: {e}. Running in LOCAL MOCK MODE.")
        app.state.mock_mode = True

async def process_telemetry(msg):
    # This will still work if NATS is connected
    data = json.loads(msg.data.decode())
    await analyze_and_publish(data)

async def analyze_and_publish(data):
    pod_id = data.get("podId")
    metrics = data.get("metrics", {})
    
    cpu = metrics.get("cpu", 0)
    memory = metrics.get("memory", 0)
    
    # Simple Dendritic Cell Algorithm (Weighted Signal Fusion)
    danger_score = 0
    signals = []
    
    if cpu > CPU_THRESHOLD:
        danger_score += (cpu - CPU_THRESHOLD) * 0.5
        signals.append("CPU_SPIKE")
        
    if memory > MEM_THRESHOLD:
        danger_score += (memory - MEM_THRESHOLD) * 0.8
        signals.append("MEM_LEAK")
        
    # Cap score at 100
    danger_score = min(100, danger_score)
    
    if danger_score > 0:
        label = "DANGER" if danger_score > 70 else "WARNING"
        danger_event = {
            "podId": pod_id,
            "score": danger_score,
            "label": label,
            "triggeringSignals": signals,
            "timestamp": data.get("timestamp")
        }
        
        if getattr(app.state, "mock_mode", False):
            print(f"[MOCK DANGER] {pod_id}: Score {danger_score} ({label})")
        else:
            await nc.publish("danger.score", json.dumps(danger_event).encode())
            print(f"Danger detected in {pod_id}: Score {danger_score}")

@app.get("/health")
async def health():
    return {"status": "Dendritic Agent Optimal", "nats_connected": nc.is_connected}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
