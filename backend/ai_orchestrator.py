import random
import asyncio
import re

class AIOrchestrator:
    def __init__(self):
        self.MAX_INPUT_TOKENS = 4000
        self.MAX_OUTPUT_TOKENS = 1000

    def sanitize_input(self, text: str) -> str:
        if not isinstance(text, str):
            text = str(text)
        # Prevent prompt injection and script injection
        sanitized = re.sub(r'[<>{}\[\]\\]', '', text)
        return sanitized[:self.MAX_INPUT_TOKENS]

    def enforce_output_limit(self, text: str) -> str:
        return text[:self.MAX_OUTPUT_TOKENS]
        
    async def analyze_anomaly(self, service: str, metrics: dict):
        """Simulate an AI analyzing an anomaly and returning an RCA."""
        # Security: sanitize service name
        safe_service = self.sanitize_input(service)
        
        await asyncio.sleep(2)  # Simulate AI thinking time
        
        confidence = round(random.uniform(0.85, 0.98), 2)
        
        rca_scenarios = {
            "services/checkout-api": {
                "root_cause": "Payment Gateway Timeout",
                "details": "External payment provider API latency spiked to 5000ms, causing thread pool exhaustion in the checkout service.",
                "remediation": [
                    {"step": 1, "action": "Increase timeout threshold temporarily", "command": "kubectl set env deploy/checkout-api PAYMENT_TIMEOUT=10s"},
                    {"step": 2, "action": "Scale up replicas to handle backlog", "command": "kubectl scale deploy/checkout-api --replicas=10"}
                ]
            },
            "services/user-profile": {
                "root_cause": "Database Index Missing",
                "details": "Recent deployment introduced a new query that is performing a full table scan on the users table, leading to high CPU and 5xx errors.",
                "remediation": [
                    {"step": 1, "action": "Rollback deployment", "command": "kubectl rollout undo deploy/user-profile"},
                    {"step": 2, "action": "Add missing index (async)", "command": "CREATE INDEX idx_user_last_login ON users(last_login);"}
                ]
            },
            "cache-cluster-02": {
                "root_cause": "Redis Connection Pool Exhaustion",
                "details": "Sudden surge in traffic caused the Redis connection pool to hit its maximum limit (10000). Requests are queuing up.",
                "remediation": [
                    {"step": 1, "action": "Increase max connections", "command": "redis-cli config set maxclients 20000"},
                    {"step": 2, "action": "Flush stale connections", "command": "redis-cli client kill type normal"}
                ]
            }
        }
        
        scenario = rca_scenarios.get(safe_service)
        if not scenario:
             scenario = rca_scenarios["cache-cluster-02"]
             
        # Security: enforce limits
        scenario["details"] = self.enforce_output_limit(scenario["details"])
             
        return {
            "root_cause": self.enforce_output_limit(scenario["root_cause"]),
            "details": scenario["details"],
            "confidence": confidence,
            "remediation_steps": scenario["remediation"]
        }

    def fingerprint_incident(self, root_cause, service):
        """Simulate matching an incident against historical memory."""
        safe_cause = self.sanitize_input(root_cause)
        return {
            "similarity": round(random.uniform(0.70, 0.95), 2),
            "historical_incident_id": f"INC-{random.randint(1000, 9999)}",
            "message": self.enforce_output_limit(f"Similar to previous {safe_cause} incident.")
        }
        
ai_engine = AIOrchestrator()
