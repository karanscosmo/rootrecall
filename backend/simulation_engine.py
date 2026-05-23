import asyncio
import random
import datetime
from database import SessionLocal, Incident, SystemSettings

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
        self.listeners = [] # List of async queues for broadcasting updates
        self.task = None

    def _update_db_incident_status(self, incident_id_str, status, root_cause=None, confidence=None, remediation_steps=None):
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
            print(f"Error updating db incident: {e}")

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
        await self.broadcast("status_change", {"state": self.state, "message": "Deployment v2.4.1 initiated."})
        return True

    def _is_auto_remediate_enabled(self):
        try:
            db = SessionLocal()
            s = db.query(SystemSettings).filter(SystemSettings.key == "ai_preferences").first()
            val = False
            if s and isinstance(s.value, dict):
                val = s.value.get("autoRemediate", False)
            db.close()
            return val
        except Exception as e:
            print(f"Error querying autoRemediate setting: {e}")
        return False

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
                
                # Auto-trigger a new anomaly loop after 60 seconds in HEALTHY state
                healthy_duration += 2
                if healthy_duration >= 60:
                    healthy_duration = 0
                    self.state = "DEPLOYMENT"
                    await self.broadcast("status_change", {"state": self.state, "message": "Automated deployment v2.4.1 initiated by timer."})
            
            elif self.state == "DEPLOYMENT":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["cpu"] += 8
                if self.metrics["cpu"] > 60:
                    self.state = "ANOMALY"
                    self.active_incident = {
                        "id": "INC-8241",
                        "service": "cache",
                        "severity": "SEV-1",
                        "status": "active"
                    }
                    self._update_db_incident_status("INC-8241", "active")
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
                    rca = await self.ai_engine.analyze_anomaly("cache-cluster-02", self.metrics)
                    # Mapping service cache-cluster-02 back to frontend 'cache'
                    self.active_incident.update(rca)
                    self.state = "RCA_GENERATED"
                    self._update_db_incident_status(
                        "INC-8241",
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
                     if self._is_auto_remediate_enabled():
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
                    self._update_db_incident_status("INC-8241", "resolved")
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

        if self.state == "DEPLOYMENT":
            svc["auth"]["cpu"] = 65 + random.uniform(2, 5)
            svc["auth"]["memory"] = 70 + random.uniform(1, 3)
            svc["auth"]["status"] = "deploying"

        elif self.state in ["ANOMALY", "RCA_GENERATED"]:
            svc["cache"]["cpu"] = 99.0
            svc["cache"]["memory"] = 100.0
            svc["cache"]["errors"] = 100.0
            svc["cache"]["status"] = "critical"

            svc["checkout"]["latency"] = 5200 + random.uniform(-200, 200)
            svc["checkout"]["errors"] = 98.0 + random.uniform(-1, 1)
            svc["checkout"]["cpu"] = 95.0 + random.uniform(-2, 2)
            svc["checkout"]["status"] = "critical"

            svc["auth"]["latency"] = 420 + random.uniform(-30, 30)
            svc["auth"]["errors"] = 2.4 + random.uniform(-0.5, 0.5)
            svc["auth"]["cpu"] = 68.0 + random.uniform(-3, 3)
            svc["auth"]["status"] = "degraded"

            svc["db-primary"]["latency"] = 380 + random.uniform(-20, 20)
            svc["db-primary"]["cpu"] = 78.0 + random.uniform(-3, 3)
            svc["db-primary"]["status"] = "degraded"

        elif self.state == "REMEDIATING":
            factor = (self.metrics["latency"] - 18) / (2400 - 18) if self.metrics["latency"] > 18 else 0
            factor = max(0, min(1, factor))
            
            svc["cache"]["cpu"] = 15 + factor * 84
            svc["cache"]["memory"] = 60 + factor * 40
            svc["cache"]["errors"] = factor * 100
            svc["cache"]["status"] = "critical" if factor > 0.5 else ("degraded" if factor > 0.1 else "healthy")

            svc["checkout"]["latency"] = 40 + factor * 5160
            svc["checkout"]["errors"] = 0.1 + factor * 97.9
            svc["checkout"]["cpu"] = 25 + factor * 70
            svc["checkout"]["status"] = "critical" if factor > 0.5 else ("degraded" if factor > 0.1 else "healthy")

            svc["auth"]["latency"] = 45 + factor * 375
            svc["auth"]["errors"] = 0.1 + factor * 2.3
            svc["auth"]["cpu"] = 30 + factor * 38
            svc["auth"]["status"] = "degraded" if factor > 0.1 else "healthy"

        return svc

    async def apply_remediation(self):
        if self.state == "RCA_GENERATED":
            self.state = "REMEDIATING"
            self._update_db_incident_status("INC-8241", "mitigated")
            await self.broadcast("status_change", {"state": self.state, "message": "Applying AI suggested remediation."})
            return True
        return False
