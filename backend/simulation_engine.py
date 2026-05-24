import asyncio
import random
import datetime
import structlog

logger = structlog.get_logger()
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
        
        # Real-time service topology with independent health trackers
        self.services = {
            "api-gw": {"latency": 15, "errors": 0.05, "cpu": 20, "memory": 40, "status": "healthy"},
            "auth": {"latency": 45, "errors": 0.1, "cpu": 30, "memory": 50, "status": "healthy"},
            "checkout": {"latency": 40, "errors": 0.1, "cpu": 25, "memory": 55, "status": "healthy"},
            "user-api": {"latency": 30, "errors": 0.1, "cpu": 20, "memory": 45, "status": "healthy"},
            "cache": {"latency": 2, "errors": 0.0, "cpu": 15, "memory": 60, "status": "healthy"},
            "db-primary": {"latency": 25, "errors": 0.1, "cpu": 35, "memory": 70, "status": "healthy"},
            "worker": {"latency": 100, "errors": 0.2, "cpu": 40, "memory": 65, "status": "healthy"}
        }
        
        # Dependency graph for cascading failures
        self.topology_graph = {
            "api-gw": ["auth", "checkout", "user-api"],
            "auth": ["db-primary", "cache"],
            "checkout": ["cache", "worker"],
            "user-api": ["db-primary", "cache"],
            "worker": ["db-primary", "cache"],
            "cache": [],
            "db-primary": []
        }
        
        self.failing_service = None
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
        self.failing_service = random.choice(list(self.services.keys()))
        await self.broadcast("status_change", {"state": self.state, "message": f"Deployment to {self.failing_service} initiated."})
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

    def _tick_telemetry_healthy(self):
        # Baseline healthy fluctuations
        self.metrics["latency"] = max(15, min(45, self.metrics["latency"] + random.uniform(-3, 3)))
        self.metrics["cpu"] = max(15, min(45, self.metrics["cpu"] + random.uniform(-2, 2)))
        self.metrics["errors"] = max(0.01, min(0.5, self.metrics["errors"] + random.uniform(-0.02, 0.02)))
        for svc in self.services.values():
            svc["status"] = "healthy"

    def _cascade_failure(self):
        """Propagate failure up the topology graph"""
        if not self.failing_service:
            return
            
        # Fail the root service
        self.services[self.failing_service]["cpu"] = min(99, self.services[self.failing_service]["cpu"] + random.uniform(5, 10))
        self.services[self.failing_service]["latency"] += random.uniform(100, 300)
        self.services[self.failing_service]["errors"] += random.uniform(2.0, 5.0)
        self.services[self.failing_service]["status"] = "critical"
        
        # Propagate to upstream dependents
        for upstream, dependencies in self.topology_graph.items():
            if self.failing_service in dependencies:
                # Upstream suffers latency/errors
                self.services[upstream]["latency"] += random.uniform(50, 150)
                self.services[upstream]["errors"] += random.uniform(0.5, 2.0)
                if self.services[upstream]["latency"] > 500:
                    self.services[upstream]["status"] = "critical"
                elif self.services[upstream]["latency"] > 200:
                    self.services[upstream]["status"] = "degraded"

    async def _run_loop(self):
        healthy_duration = 0
        rca_generated_duration = 0
        while True:
            await asyncio.sleep(2) # Update every 2 seconds
            
            if self.state == "HEALTHY":
                self._tick_telemetry_healthy()
                healthy_duration += 2
                if healthy_duration >= 180: # Every 3 minutes
                    healthy_duration = 0
                    self.state = "DEPLOYMENT"
                    self.failing_service = random.choice(list(self.services.keys()))
                    await self.broadcast("status_change", {"state": self.state, "message": f"Automated deployment to {self.failing_service} initiated."})
            
            elif self.state == "DEPLOYMENT":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["cpu"] += 8
                self.services[self.failing_service]["status"] = "deploying"
                if self.metrics["cpu"] > 60:
                    self.state = "ANOMALY"
                    inc_id = f"INC-{random.randint(8000, 9999)}"
                    self.active_incident = {
                        "id": inc_id,
                        "service": self.failing_service,
                        "severity": "SEV-1",
                        "status": "active"
                    }
                    await self._update_db_incident_status(inc_id, "active")
                    await self.broadcast("incident_created", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "Anomaly detected during deployment."})
            
            elif self.state == "ANOMALY":
                self.metrics["latency"] += random.uniform(150, 300)
                self.metrics["cpu"] = min(99, self.metrics["cpu"] + random.uniform(4, 8))
                self.metrics["errors"] += random.uniform(4.0, 8.0)
                
                self._cascade_failure()
                
                if self.metrics["latency"] > 800:
                    # Trigger RCA via Real AI Orchestrator
                    await self.broadcast("ai_thinking", {"message": "AI Copilot analyzing real-time telemetry stream..."})
                    
                    # Pass the full snapshot to the AI
                    snapshot = {
                        "global": self.metrics,
                        "services": self.services
                    }
                    
                    # Async AI generation
                    rca = await self.ai_engine.analyze_anomaly(self.failing_service, snapshot)
                    
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
                 self._cascade_failure() # Continues failing
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
                # Gradual recovery
                self.metrics["latency"] = max(18, self.metrics["latency"] - 500)
                self.metrics["cpu"] = max(22, self.metrics["cpu"] - 15)
                self.metrics["errors"] = max(0.1, self.metrics["errors"] - 15.0)
                
                for k, v in self.services.items():
                    self.services[k]["latency"] = max(5, self.services[k]["latency"] - 200)
                    self.services[k]["cpu"] = max(10, self.services[k]["cpu"] - 10)
                    self.services[k]["errors"] = max(0, self.services[k]["errors"] - 5.0)
                    if self.services[k]["latency"] < 100:
                        self.services[k]["status"] = "healthy"
                
                if self.metrics["latency"] < 100:
                    self.state = "RESOLVED"
                    self.active_incident["status"] = "resolved"
                    await self._update_db_incident_status(self.active_incident["id"], "resolved")
                    await self.broadcast("incident_resolved", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "System stabilized."})
                    
            elif self.state == "RESOLVED":
                self._tick_telemetry_healthy()
                if random.random() < 0.15:
                    self.state = "HEALTHY"
                    self.active_incident = None
                    self.failing_service = None

            # Always broadcast telemetry
            payload = {
                "latency": self.metrics["latency"],
                "cpu": self.metrics["cpu"],
                "errors": self.metrics["errors"],
                "service_metrics": self.services
            }
            await self.broadcast("telemetry", payload)

    async def apply_remediation(self):
        if self.state == "RCA_GENERATED":
            self.state = "REMEDIATING"
            await self._update_db_incident_status(self.active_incident["id"], "mitigated")
            await self.broadcast("status_change", {"state": self.state, "message": "Applying AI suggested remediation."})
            return True
        return False
