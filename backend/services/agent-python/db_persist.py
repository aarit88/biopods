"""
Database persistence layer for the Bio Pod Patrol Agent.
Uses sqlite3 directly to write analysis results into the shared Prisma SQLite database.
"""

import sqlite3
import uuid
import os
from datetime import datetime

# Resolve the path to the shared Prisma SQLite database
DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "shared", "db", "prisma", "dev.db"
)
DB_PATH = os.path.normpath(DB_PATH)


def _get_connection():
    """Get a connection to the shared SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # Allow concurrent reads during writes
    conn.execute("PRAGMA foreign_keys=OFF")  # Allow inserts even if podId FK is missing
    return conn


def persist_analysis(pod_id: str, pod_name: str, threat_data: dict, analysis: dict, response_time_ms: int):
    """
    Persist the Ollama T-Cell analysis results into the database.
    Creates:
      1. DangerEvent  — the detected threat
      2. ImmuneResponse — the T-Cell's mitigation plan
      3. MemoryCell (upsert) — immune memory for future pattern matching
      4. AuditLog — full audit trail
    """
    try:
        conn = _get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat() + "Z"

        # 1. Create DangerEvent
        event_id = str(uuid.uuid4())
        event_type = threat_data.get("eventType") or threat_data.get("type", "Unknown Threat")
        severity = (analysis.get("threat_severity") or "HIGH").lower()
        danger_score = threat_data.get("dangerScore") or threat_data.get("metrics", {}).get("cpu", 0)

        cursor.execute(
            """INSERT INTO danger_events
               (id, pod_id, event_type, danger_score, severity, infection_zone, status, detected_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id,
                pod_id,
                event_type,
                float(danger_score),
                severity,
                f"zone-{pod_name}" if pod_name else "zone-unknown",
                "active",
                "TCell-Patrol-Agent",
                now,
            ),
        )
        print(f"[DB] DangerEvent persisted: {event_id}")

        # 2. Create ImmuneResponse
        response_id = str(uuid.uuid4())
        action_taken = analysis.get("action_command", "T-Cell autonomous response")
        root_cause = analysis.get("root_cause_analysis", "Undetermined")
        success_rate = {"LOW": 95.0, "MEDIUM": 80.0, "HIGH": 65.0}.get(
            (analysis.get("threat_severity") or "HIGH").upper(), 70.0
        )

        cursor.execute(
            """INSERT INTO immune_responses
               (id, event_id, response_type, action_taken, success_rate, response_time_ms, triggered_by, response_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                response_id,
                event_id,
                "tcell-ollama-reasoning",
                f"{root_cause} -> {action_taken}",
                success_rate,
                response_time_ms,
                "TCell-Patrol-Agent",
                "completed",
                now,
            ),
        )
        print(f"[DB] ImmuneResponse persisted: {response_id}")

        # 3. Upsert MemoryCell — the immune system "remembers" this threat
        threat_signature = (event_type or "unknown").lower().replace(" ", "-")

        cursor.execute(
            "SELECT id, success_count, affinity_score FROM memory_cells WHERE threat_signature = ?",
            (threat_signature,),
        )
        existing = cursor.fetchone()

        if existing:
            new_count = (existing["success_count"] or 0) + 1
            new_affinity = min(99.9, (existing["affinity_score"] or 50.0) + 0.5)
            cursor.execute(
                """UPDATE memory_cells
                   SET success_count = ?, affinity_score = ?, last_seen = ?,
                       mitigation_strategy = ?
                   WHERE id = ?""",
                (
                    new_count,
                    new_affinity,
                    now,
                    analysis.get("action_command", "ollama-derived-strategy"),
                    existing["id"],
                ),
            )
            print(f"[DB] MemoryCell updated: {existing['id']} (seen {new_count} times)")
        else:
            memory_id = str(uuid.uuid4())
            cursor.execute(
                """INSERT INTO memory_cells
                   (id, threat_signature, vector_id, mitigation_strategy, affinity_score, success_count, last_seen, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    memory_id,
                    threat_signature,
                    f"vec-tcell-{int(datetime.utcnow().timestamp())}",
                    analysis.get("action_command", "ollama-derived-strategy"),
                    50.0,
                    1,
                    now,
                    now,
                ),
            )
            print(f"[DB] MemoryCell created: {memory_id} -- signature: {threat_signature}")

        # 4. Write AuditLog
        audit_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO audit_logs
               (id, action_type, action_description, performed_by, target_resource, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                audit_id,
                "TCELL_OLLAMA_ANALYSIS",
                f"T-Cell analyzed '{event_type}' for pod {pod_name or pod_id}. "
                f"Severity: {analysis.get('threat_severity', 'UNKNOWN')}. "
                f"Root Cause: {root_cause}. "
                f"Action: {action_taken}.",
                "TCell-Patrol-Agent",
                pod_id or "unknown-pod",
                "completed",
                now,
            ),
        )
        print(f"[DB] AuditLog entry written: {audit_id}")

        conn.commit()
        conn.close()
        return {"event_id": event_id, "response_id": response_id, "persisted": True}

    except Exception as e:
        print(f"[DB ERROR] Persistence failed: {e}")
        return {"persisted": False, "error": str(e)}
