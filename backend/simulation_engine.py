import asyncio
import random
import datetime
import structlog

logger = structlog.get_logger()
from database import SessionLocal, Incident, SystemSettings

# 8 Different Scenarios for the simulation engine
SCENARIOS = [
    {
        "id": "INC-REDIS",
        "service": "cache",
        "severity": "SEV-1",
        "root_cause": "Redis maxmemory policy misconfigured, eviction disabled leading to OOM.",
        "confidence": 0.94,
        "affected": ["cache", "api-gw", "checkout"],
        "remediation_steps": [
            {"step": 1, "action": "Increase maxmemory threshold temporarily", "command": "redis-cli config set maxmemory 8gb"},
            {"step": 2, "action": "Set eviction policy", "command": "redis-cli config set maxmemory-policy allkeys-lru"}
        ]
    },
    {
        "id": "INC-POD",
        "service": "worker",
        "severity": "SEV-2",
        "root_cause": "Memory leak in worker causing node memory pressure and OOMKilled events.",
        "confidence": 0.88,
        "affected": ["worker", "job-queue", "db-primary"],
        "remediation_steps": [
            {"step": 1, "action": "Rollback worker deployment", "command": "kubectl rollout undo deploy/worker"},
            {"step": 2, "action": "Scale up temporarily to drain queue", "command": "kubectl scale deploy/worker --replicas=20"}
        ]
    },
    {
        "id": "INC-DB",
        "service": "db-primary",
        "severity": "SEV-1",
        "root_cause": "Unpaginated query from user-api holding locks too long.",
        "confidence": 0.96,
        "affected": ["db-primary", "user-api", "auth"],
        "remediation_steps": [
            {"step": 1, "action": "Terminate long-running queries", "command": "SELECT pg_terminate_backend(pid);"},
            {"step": 2, "action": "Scale user-api pods down", "command": "kubectl scale deploy/user-api --replicas=2"}
        ]
    },
    {
        "id": "INC-AUTH",
        "service": "auth",
        "severity": "SEV-2",
        "root_cause": "New encryption library consumes 3x CPU for token validation.",
        "confidence": 0.91,
        "affected": ["auth", "api-gw"],
        "remediation_steps": [
            {"step": 1, "action": "Rollback auth-service", "command": "kubectl rollout undo deploy/auth"}
        ]
    },
    {
        "id": "INC-GW",
        "service": "api-gw",
        "severity": "SEV-1",
        "root_cause": "Upstream connection limits reached due to misconfigured rate limiter.",
        "confidence": 0.98,
        "affected": ["api-gw", "checkout", "auth"],
        "remediation_steps": [
            {"step": 1, "action": "Revert rate limit config", "command": "kubectl apply -f config/gateway-limits.yaml"},
            {"step": 2, "action": "Restart gateway pods", "command": "kubectl rollout restart deploy/api-gw"}
        ]
    }
]

class SimulationEngine:
    def __init__(self, ai_engine):
        self.state = "HEALTHY" # HEALTHY -> DEPLOYMENT -> ANOMALY -> RCA_GENERATED -> REMEDIATING -> RESOLVED
        self.ai_engine = ai_engine
        self.metrics = {
            "latency": 45,
            "cpu": 30,
            "errors": 0.1
        }
        self.active_incident = None
        self.current_scenario = None
        self.listeners = [] # List of async queues for broadcasting updates
        self.task = None

    def _update_db_incident_status_sync(self, incident_id_str, status, root_cause=None, confidence=None, remediation_steps=None):
        try:
            db = SessionLocal()
            inc_id = int(incident_id_str.replace("INC-", ""))
            db_inc = db.query(Incident).filter(Incident.id == inc_id).first()
            if db_inc:
                db_inc.status = status
                if root_cause is not None:
                    db_inc.root_cause = root_cause
                if confidence is not None:
                    db_inc.confidence = confidence
                if remediation_steps is not None:
                    db_inc.remediation_steps = remediation_steps
                db.commit()
            db.close()
        except Exception as e:
            logger.error("Database update error", error=str(e))

    async def _update_db_incident_status(self, incident_id_str, status, root_cause=None, confidence=None, remediation_steps=None):
        await asyncio.to_thread(self._update_db_incident_status_sync, incident_id_str, status, root_cause, confidence, remediation_steps)

    def start(self):
        if self.task is None:
            self.task = asyncio.create_task(self._run_loop())

    def subscribe(self, queue):
        self.listeners.append(queue)

    def unsubscribe(self, queue):
        if queue in self.listeners:
            self.listeners.remove(queue)

    async def broadcast(self, event_type, data):
        event = {
            "type": event_type,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "data": data
        }
        for q in self.listeners:
            await q.put(event)

    async def trigger_demo(self):
        if self.state != "HEALTHY":
            return False
        self.state = "DEPLOYMENT"
        self.current_scenario = random.choice(SCENARIOS)
        await self.broadcast("status_change", {"state": self.state, "message": f"Deployment to {self.current_scenario['service']} initiated."})
        return True

    def _is_auto_remediate_enabled_sync(self):
        try:
            db = SessionLocal()
            s = db.query(SystemSettings).filter(SystemSettings.key == "ai_preferences").first()
            val = False
            if s and isinstance(s.value, dict):
                val = s.value.get("autoRemediate", False)
            db.close()
            return val
        except Exception:
            return False

    async def _is_auto_remediate_enabled(self):
        return await asyncio.to_thread(self._is_auto_remediate_enabled_sync)

    async def _run_loop(self):
        healthy_duration = 0
        rca_generated_duration = 0
        while True:
            await asyncio.sleep(2) # Update every 2 seconds
            
            # Fluctuate metrics slightly based on state
            if self.state == "HEALTHY":
                self.metrics["latency"] = max(15, min(45, self.metrics["latency"] + random.uniform(-3, 3)))
                self.metrics["cpu"] = max(15, min(45, self.metrics["cpu"] + random.uniform(-2, 2)))
                self.metrics["errors"] = max(0.01, min(0.5, self.metrics["errors"] + random.uniform(-0.02, 0.02)))
                
                # Auto-trigger a new anomaly loop after ~2 mins in HEALTHY state
                healthy_duration += 2
                if healthy_duration >= 120:
                    healthy_duration = 0
                    self.state = "DEPLOYMENT"
                    self.current_scenario = random.choice(SCENARIOS)
                    await self.broadcast("status_change", {"state": self.state, "message": f"Automated deployment to {self.current_scenario['service']} initiated."})
            
            elif self.state == "DEPLOYMENT":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["cpu"] += 8
                if self.metrics["cpu"] > 60:
                    self.state = "ANOMALY"
                    inc_id = f"INC-{random.randint(8000, 9999)}"
                    self.active_incident = {
                        "id": inc_id,
                        "service": self.current_scenario["service"],
                        "severity": self.current_scenario["severity"],
                        "status": "active"
                    }
                    await self._update_db_incident_status(inc_id, "active")
                    await self.broadcast("incident_created", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "Anomaly detected during deployment."})
            
            elif self.state == "ANOMALY":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["latency"] += random.uniform(150, 300)
                self.metrics["cpu"] = min(99, self.metrics["cpu"] + random.uniform(4, 8))
                self.metrics["errors"] += random.uniform(4.0, 8.0)
                
                if self.metrics["latency"] > 800:
                    # Trigger RCA
                    await self.broadcast("ai_thinking", {"message": "AI Copilot analyzing telemetry..."})
                    rca = {
                        "root_cause": self.current_scenario["root_cause"],
                        "confidence": self.current_scenario["confidence"],
                        "remediation_steps": self.current_scenario["remediation_steps"]
                    }
                    self.active_incident.update(rca)
                    self.state = "RCA_GENERATED"
                    await self._update_db_incident_status(
                        self.active_incident["id"],
                        "active",
                        root_cause=rca.get("root_cause"),
                        confidence=rca.get("confidence"),
                        remediation_steps=rca.get("remediation_steps")
                    )
                    await self.broadcast("rca_ready", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "AI Copilot has generated RCA."})
 
            elif self.state == "RCA_GENERATED":
                 healthy_duration = 0
                 self.metrics["latency"] = max(2400, min(5200, self.metrics["latency"] + random.uniform(-50, 50)))
                 self.metrics["cpu"] = max(90, min(99, self.metrics["cpu"] + random.uniform(-1, 1)))
                 self.metrics["errors"] = max(45, min(98, self.metrics["errors"] + random.uniform(-2, 2)))
                 
                 # Automated remediation if autoRemediate preference is enabled
                 rca_generated_duration += 2
                 if rca_generated_duration >= 14:
                     rca_generated_duration = 0
                     if await self._is_auto_remediate_enabled():
                         await self.apply_remediation()

            elif self.state == "REMEDIATING":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["latency"] = max(18, self.metrics["latency"] - 500)
                self.metrics["cpu"] = max(22, self.metrics["cpu"] - 15)
                self.metrics["errors"] = max(0.1, self.metrics["errors"] - 15.0)
                
                if self.metrics["latency"] < 100:
                    self.state = "RESOLVED"
                    self.active_incident["status"] = "resolved"
                    await self._update_db_incident_status(self.active_incident["id"], "resolved")
                    await self.broadcast("incident_resolved", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "System stabilized."})
                    
            elif self.state == "RESOLVED":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["latency"] = max(15, min(35, self.metrics["latency"] + random.uniform(-2, 2)))
                self.metrics["cpu"] = max(15, min(35, self.metrics["cpu"] + random.uniform(-2, 2)))
                self.metrics["errors"] = max(0, min(0.3, self.metrics["errors"] + random.uniform(-0.05, 0.05)))
                # Reset after a while
                if random.random() < 0.15:
                    self.state = "HEALTHY"
                    self.active_incident = None
                    self.current_scenario = None

            # Always broadcast telemetry with service-specific overrides
            payload = {
                "latency": self.metrics["latency"],
                "cpu": self.metrics["cpu"],
                "errors": self.metrics["errors"],
                "service_metrics": self._get_service_metrics()
            }
            await self.broadcast("telemetry", payload)

    def _get_service_metrics(self):
        # Default healthy
        svc = {
            "api-gw": {"latency": 15 + random.uniform(-2, 2), "errors": 0.05, "cpu": 20 + random.uniform(-2, 2), "memory": 40 + random.uniform(-1, 1), "status": "healthy"},
            "auth": {"latency": 45 + random.uniform(-5, 5), "errors": 0.1, "cpu": 30 + random.uniform(-3, 3), "memory": 50 + random.uniform(-2, 2), "status": "healthy"},
            "checkout": {"latency": 40 + random.uniform(-5, 5), "errors": 0.1, "cpu": 25 + random.uniform(-2, 2), "memory": 55 + random.uniform(-2, 2), "status": "healthy"},
            "user-api": {"latency": 30 + random.uniform(-3, 3), "errors": 0.1, "cpu": 20 + random.uniform(-2, 2), "memory": 45 + random.uniform(-1, 1), "status": "healthy"},
            "cache": {"latency": 2 + random.uniform(-0.5, 0.5), "errors": 0.0, "cpu": 15 + random.uniform(-2, 2), "memory": 60 + random.uniform(-2, 2), "status": "healthy"},
            "db-primary": {"latency": 25 + random.uniform(-3, 3), "errors": 0.1, "cpu": 35 + random.uniform(-3, 3), "memory": 70 + random.uniform(-2, 2), "status": "healthy"},
            "worker": {"latency": 100 + random.uniform(-10, 10), "errors": 0.2, "cpu": 40 + random.uniform(-4, 4), "memory": 65 + random.uniform(-2, 2), "status": "healthy"}
        }

        if self.state != "HEALTHY" and self.current_scenario:
            affected = self.current_scenario["affected"]
            
            if self.state == "DEPLOYMENT":
                for s in affected:
                    svc[s]["cpu"] = 65 + random.uniform(2, 5)
                    svc[s]["status"] = "deploying"
                    
            elif self.state in ["ANOMALY", "RCA_GENERATED"]:
                for s in affected:
                    svc[s]["cpu"] = 95.0 + random.uniform(-2, 4)
                    svc[s]["errors"] = 80.0 + random.uniform(-5, 5)
                    svc[s]["latency"] = 4000 + random.uniform(-200, 200)
                    svc[s]["status"] = "critical"

            elif self.state == "REMEDIATING":
                factor = (self.metrics["latency"] - 18) / (2400 - 18) if self.metrics["latency"] > 18 else 0
                factor = max(0, min(1, factor))
                for s in affected:
                    svc[s]["cpu"] = 20 + factor * 75
                    svc[s]["errors"] = factor * 80
                    svc[s]["latency"] = 20 + factor * 3980
                    svc[s]["status"] = "critical" if factor > 0.5 else ("degraded" if factor > 0.1 else "healthy")

        return svc

    async def apply_remediation(self):
        if self.state == "RCA_GENERATED":
            self.state = "REMEDIATING"
            await self._update_db_incident_status(self.active_incident["id"], "mitigated")
            await self.broadcast("status_change", {"state": self.state, "message": "Applying AI suggested remediation."})
            return True
        return False
