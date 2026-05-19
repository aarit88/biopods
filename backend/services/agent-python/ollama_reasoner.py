import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = "llama3"

SYSTEM_PROMPT = """
You are an autonomous Bio Pod agent (T-Cell) protecting an active system.
Analyze the incoming threat log. 
Formulate a structured JSON mitigation plan containing:
- "threat_severity": "LOW" | "MEDIUM" | "HIGH"
- "root_cause_analysis": "string"
- "action_command": "exact bash command or API call to execute"
- "expected_outcome": "string"

Respond ONLY with the raw JSON object. No preamble, no markdown formatting.
"""

def analyze_threat(threat_data):
    prompt = f"Threat Data: {json.dumps(threat_data)}"
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL,
                "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
                "stream": False
            },
            timeout=30
        )
        
        raw_response = response.json().get("response", "").strip()
        # Attempt to parse JSON
        try:
            # Clean potential markdown backticks if Ollama didn't follow instructions
            if raw_response.startswith("```json"):
                raw_response = raw_response[7:-3]
            elif raw_response.startswith("```"):
                raw_response = raw_response[3:-3]
                
            return json.loads(raw_response)
        except Exception as e:
            print(f"Failed to parse Ollama JSON: {e}")
            return {
                "threat_severity": "HIGH",
                "root_cause_analysis": "Undetermined metabolic anomaly",
                "action_command": "isolate --pod " + threat_data.get('podId', 'unknown'),
                "expected_outcome": "Containment of unverified threat"
            }
            
    except Exception as e:
        print(f"Ollama connection failed: {e}")
        return {
            "threat_severity": "MEDIUM",
            "root_cause_analysis": "Ollama T-Cell offline",
            "action_command": "default-mitigation --target " + threat_data.get('podId', 'unknown'),
            "expected_outcome": "Manual intervention required"
        }

if __name__ == "__main__":
    # Test
    print(analyze_threat({"podId": "turbine-01", "metrics": {"cpu": 98}}))
