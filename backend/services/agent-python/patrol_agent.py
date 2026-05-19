import uvicorn
from fastapi import FastAPI, Request
from ollama_reasoner import analyze_threat
from db_persist import persist_analysis
import requests
import json
import os
import time

app = FastAPI(title="Bio Pod Patrol Agent")

HUB_URL = "http://localhost:3001/api/events"

@app.post("/events")
async def handle_events(request: Request):
    event = await request.json()
    subject = event.get("subject")
    data = event.get("data")
    
    if subject == "system-threats":
        print(f"[T-Cell] Threat Detected: {data.get('podId')}")
        
        # Trigger Ollama Analysis
        start_time = time.time()
        analysis = analyze_threat(data)
        response_time_ms = int((time.time() - start_time) * 1000)
        print(f"[T-Cell] Reasoning Complete: {analysis.get('threat_severity')}")

        # Persist analysis results to the database
        db_result = persist_analysis(
            pod_id=data.get("podId", ""),
            pod_name=data.get("podName", ""),
            threat_data=data,
            analysis=analysis,
            response_time_ms=response_time_ms,
        )
        print(f"[T-Cell] DB Persistence: {'[SUCCESS]' if db_result.get('persisted') else '[FAILED]'}")
        
        # Publish Mitigation Plan back to the Hub for Visualization
        mitigation_event = {
            "type": "T-Cell Analysis",
            "podId": data.get("podId"),
            "analysis": analysis,
            "dbEventId": db_result.get("event_id"),
            "timestamp": data.get("timestamp")
        }
        
        # Broadcast the reasoning process
        broadcast_reasoning(data.get("podId"), analysis)
        
        try:
            requests.post(HUB_URL, json={
                "subject": "threat.verified",
                "data": {
                    "podId": data.get("podId"),
                    "type": data.get("type", "Autonomic T-Cell Response"),
                    "label": analysis.get("threat_severity"),
                    "details": analysis.get("root_cause_analysis"),
                    "action": analysis.get("action_command"),
                    "dbEventId": db_result.get("event_id"),
                    "responseTimeMs": response_time_ms,
                }
            })
        except Exception as e:
            print(f"Failed to publish mitigation: {e}")

    return {"status": "ACK"}

def broadcast_reasoning(pod_id, analysis):
    # This will be picked up by the "Reasoning Terminal" in the UI
    try:
        requests.post(HUB_URL, json={
            "subject": "ai.reasoning",
            "data": {
                "podId": pod_id,
                "step": "FORMULATING MITIGATION",
                "content": json.dumps(analysis, indent=2)
            }
        })
    except:
        pass

if __name__ == "__main__":
    print("Bio Pod Patrol Agent Active (DB-integrated)...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
