import asyncio
import random
import datetime
import structlog

logger = structlog.get_logger()
from database import SessionLocal, Incident, SystemSettings

SCENARIOS = {
    "redis_saturation": {
        "service": "cache-cluster-prod",
        "message": "Redis Saturation: cache memory utilization crossed 98% threshold on primary node.",
        "incident_title": "Redis Cache Saturation & OOM Cascade",
        "severity": "SEV-1",
        "impact": "100% checkout failure rate, ~$3.2k/min revenue loss. User sessions invalidated."
    },
    "k8s_pod_failure": {
        "service": "worker-pool-async",
        "message": "Kubernetes node eviction on node worker-pool-3-us-east due to memory pressure.",
        "incident_title": "Worker Pool Degraded: Pod Eviction Cascade",
        "severity": "SEV-2",
        "impact": "Background jobs delayed, asynchronous queue latency > 15s. Reporting delayed."
    },
    "db_pool_exhaustion": {
        "service": "db-primary-cluster",
        "message": "PostgreSQL active connection pool saturation detected (connections > 400).",
        "incident_title": "PostgreSQL Connection Pool Saturation",
        "severity": "SEV-1",
        "impact": "All user profile and auth requests timing out. 503 errors returned to gateway."
    },
    "api_latency": {
        "service": "api-gateway-edge",
        "message": "API Gateway ingress queue congestion exceeding baseline by 400%.",
        "incident_title": "API Gateway Latency Spike under High Load",
        "severity": "SEV-2",
        "impact": "Ingress P99 latency > 2000ms, minor packet drops across eu-west regions."
    },
    "auth_instability": {
        "service": "auth-service-core",
        "message": "Upstream identity provider handshake timeout.",
        "incident_title": "Auth Service Degradation: Upstream Handshake Failure",
        "severity": "SEV-1",
        "impact": "90% of user logins and token refreshes failing. Internal IAM sync paused."
    }
}

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
        self.active_scenario_name = None
        
        # Real-time service topology with independent health trackers matching frontend keys
        self.services = {
            "api-gateway-edge": {"latency": 15, "errors": 0.05, "cpu": 20, "memory": 40, "status": "healthy"},
            "auth-service-core": {"latency": 45, "errors": 0.1, "cpu": 30, "memory": 50, "status": "healthy"},
            "checkout-api": {"latency": 40, "errors": 0.1, "cpu": 25, "memory": 55, "status": "healthy"},
            "user-profile": {"latency": 30, "errors": 0.1, "cpu": 20, "memory": 45, "status": "healthy"},
            "cache-cluster-prod": {"latency": 2, "errors": 0.0, "cpu": 15, "memory": 60, "status": "healthy"},
            "db-primary-cluster": {"latency": 25, "errors": 0.1, "cpu": 35, "memory": 70, "status": "healthy"},
            "worker-pool-async": {"latency": 100, "errors": 0.2, "cpu": 40, "memory": 65, "status": "healthy"},
            "job-queue": {"latency": 5, "errors": 0.0, "cpu": 10, "memory": 30, "status": "healthy"}
        }
        
        # Dependency graph for cascading failures
        self.topology_graph = {
            "api-gateway-edge": ["auth-service-core", "checkout-api", "user-profile"],
            "auth-service-core": ["db-primary-cluster", "cache-cluster-prod"],
            "checkout-api": ["cache-cluster-prod", "worker-pool-async"],
            "user-profile": ["db-primary-cluster", "cache-cluster-prod"],
            "worker-pool-async": ["db-primary-cluster", "cache-cluster-prod", "job-queue"],
            "job-queue": ["db-primary-cluster"],
            "cache-cluster-prod": [],
            "db-primary-cluster": []
        }
        
        self.failing_service = None
        self.listeners = [] # List of async queues for broadcasting updates
        self.task = None

    def _update_db_incident_status_sync(self, incident_id_str, status, title=None, service=None, severity=None, impact=None, root_cause=None, confidence=None, remediation_steps=None):
        try:
            db = SessionLocal()
            inc_id = int(incident_id_str.replace("INC-", ""))
            db_inc = db.query(Incident).filter(Incident.id == inc_id).first()
            if not db_inc:
                # If generated incident during simulation, insert it
                db_inc = Incident(
                    id=inc_id,
                    title=title or "Service Degradation Detected",
                    service=service or "unknown",
                    severity=severity or "SEV-2",
                    status=status,
                    impact=impact or "degraded service availability",
                    start_time=datetime.datetime.utcnow(),
                    is_simulated=True
                )
                db.add(db_inc)
            else:
                db_inc.status = status
                if title:
                    db_inc.title = title
                if service:
                    db_inc.service = service
                if severity:
                    db_inc.severity = severity
                if impact:
                    db_inc.impact = impact
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

    async def _update_db_incident_status(self, incident_id_str, status, title=None, service=None, severity=None, impact=None, root_cause=None, confidence=None, remediation_steps=None):
        await asyncio.to_thread(self._update_db_incident_status_sync, incident_id_str, status, title, service, severity, impact, root_cause, confidence, remediation_steps)

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

    async def trigger_demo(self, scenario_name: str = None):
        if self.state != "HEALTHY":
            return False
        
        # Pick scenario
        if scenario_name and scenario_name in SCENARIOS:
            self.active_scenario_name = scenario_name
        else:
            self.active_scenario_name = random.choice(list(SCENARIOS.keys()))
            
        scenario = SCENARIOS[self.active_scenario_name]
        self.state = "DEPLOYMENT"
        self.failing_service = scenario["service"]
        
        await self.broadcast("status_change", {"state": self.state, "message": f"Deployment rollout initiated: {scenario['message']}"})
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
        
        # Stabilize all services to their baselines
        baselines = {
            "api-gateway-edge": {"latency": 15, "errors": 0.05, "cpu": 20, "memory": 40},
            "auth-service-core": {"latency": 45, "errors": 0.1, "cpu": 30, "memory": 50},
            "checkout-api": {"latency": 40, "errors": 0.1, "cpu": 25, "memory": 55},
            "user-profile": {"latency": 30, "errors": 0.1, "cpu": 20, "memory": 45},
            "cache-cluster-prod": {"latency": 2, "errors": 0.0, "cpu": 15, "memory": 60},
            "db-primary-cluster": {"latency": 25, "errors": 0.1, "cpu": 35, "memory": 70},
            "worker-pool-async": {"latency": 100, "errors": 0.2, "cpu": 40, "memory": 65},
            "job-queue": {"latency": 5, "errors": 0.0, "cpu": 10, "memory": 30}
        }
        for k, v in self.services.items():
            base = baselines[k]
            v["status"] = "healthy"
            v["latency"] = max(1, int(base["latency"] + random.uniform(-2, 2)))
            v["errors"] = max(0.0, base["errors"] + random.uniform(-0.05, 0.05))
            v["cpu"] = max(5, int(base["cpu"] + random.uniform(-2, 2)))
            v["memory"] = base["memory"]

    def _cascade_failure(self):
        """Propagate failure realistically based on the active scenario"""
        if not self.active_scenario_name:
            return
            
        scenario = self.active_scenario_name
        
        if scenario == "redis_saturation":
            # Cache cluster goes down
            self.services["cache-cluster-prod"]["status"] = "critical"
            self.services["cache-cluster-prod"]["latency"] = 1500
            self.services["cache-cluster-prod"]["cpu"] = 99
            self.services["cache-cluster-prod"]["memory"] = 100
            self.services["cache-cluster-prod"]["errors"] = 85.0
            
            # Checkout API breaks cascadingly
            self.services["checkout-api"]["status"] = "critical"
            self.services["checkout-api"]["latency"] = 5200
            self.services["checkout-api"]["errors"] = 98.0
            self.services["checkout-api"]["cpu"] = 80
            
            # Auth service degrades slightly because it reads/writes session cache
            self.services["auth-service-core"]["status"] = "degraded"
            self.services["auth-service-core"]["latency"] = 420
            self.services["auth-service-core"]["errors"] = 12.0
            
            # API Gateway experiences ingress backup
            self.services["api-gateway-edge"]["status"] = "degraded"
            self.services["api-gateway-edge"]["latency"] = 180
            
        elif scenario == "k8s_pod_failure":
            # Worker Pool is evicted/failing
            self.services["worker-pool-async"]["status"] = "critical"
            self.services["worker-pool-async"]["cpu"] = 99
            self.services["worker-pool-async"]["latency"] = 850
            self.services["worker-pool-async"]["errors"] = 25.0
            
            # Job Queue backs up
            self.services["job-queue"]["status"] = "critical"
            self.services["job-queue"]["latency"] = 15000
            self.services["job-queue"]["cpu"] = 80
            self.services["job-queue"]["errors"] = 5.0
            
            # Checkout API depends on worker, begins returning slow responses
            self.services["checkout-api"]["status"] = "degraded"
            self.services["checkout-api"]["latency"] = 450
            self.services["checkout-api"]["errors"] = 2.5
            
        elif scenario == "db_pool_exhaustion":
            # DB saturation
            self.services["db-primary-cluster"]["status"] = "critical"
            self.services["db-primary-cluster"]["cpu"] = 99
            self.services["db-primary-cluster"]["latency"] = 2500
            self.services["db-primary-cluster"]["errors"] = 15.0
            
            # Auth and profile APIs fail directly
            self.services["auth-service-core"]["status"] = "critical"
            self.services["auth-service-core"]["latency"] = 4500
            self.services["auth-service-core"]["errors"] = 50.0
            
            self.services["user-profile"]["status"] = "critical"
            self.services["user-profile"]["latency"] = 3500
            self.services["user-profile"]["errors"] = 45.0
            
            # API Gateway times out
            self.services["api-gateway-edge"]["status"] = "degraded"
            self.services["api-gateway-edge"]["latency"] = 800
            
        elif scenario == "api_latency":
            self.services["api-gateway-edge"]["status"] = "critical"
            self.services["api-gateway-edge"]["latency"] = 2400
            self.services["api-gateway-edge"]["cpu"] = 95
            self.services["api-gateway-edge"]["errors"] = 8.5
            
        elif scenario == "auth_instability":
            # Auth service degrades
            self.services["auth-service-core"]["status"] = "critical"
            self.services["auth-service-core"]["latency"] = 5000
            self.services["auth-service-core"]["errors"] = 92.0
            
            # API Gateway experiences degradation
            self.services["api-gateway-edge"]["status"] = "degraded"
            self.services["api-gateway-edge"]["latency"] = 620

    async def _run_loop(self):
        healthy_duration = 0
        rca_generated_duration = 0
        while True:
            await asyncio.sleep(2) # Update every 2 seconds
            
            if self.state == "HEALTHY":
                self._tick_telemetry_healthy()
                healthy_duration += 2
                if healthy_duration >= 180: # Every 3 minutes trigger auto chaos
                    healthy_duration = 0
                    await self.trigger_demo()
            
            elif self.state == "DEPLOYMENT":
                healthy_duration = 0
                rca_generated_duration = 0
                self.metrics["cpu"] += 8
                self.services[self.failing_service]["status"] = "deploying"
                if self.metrics["cpu"] > 60:
                    self.state = "ANOMALY"
                    inc_id = f"INC-{random.randint(8000, 9999)}"
                    scenario = SCENARIOS[self.active_scenario_name]
                    self.active_incident = {
                        "id": inc_id,
                        "service": scenario["service"],
                        "severity": scenario["severity"],
                        "status": "active",
                        "title": scenario["incident_title"],
                        "impact": scenario["impact"],
                        "scenario": self.active_scenario_name
                    }
                    await self._update_db_incident_status(
                        inc_id, 
                        "active", 
                        title=scenario["incident_title"], 
                        service=scenario["service"], 
                        severity=scenario["severity"], 
                        impact=scenario["impact"]
                    )
                    await self.broadcast("incident_created", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": f"CRITICAL: {scenario['incident_title']} detected in production."})
            
            elif self.state == "ANOMALY":
                self.metrics["latency"] += random.uniform(150, 300)
                self.metrics["cpu"] = min(99, self.metrics["cpu"] + random.uniform(4, 8))
                self.metrics["errors"] += random.uniform(4.0, 8.0)
                
                self._cascade_failure()
                
                # Check latency threshold
                if self.metrics["latency"] > 800:
                    await self.broadcast("ai_thinking", {"message": "AI Copilot performing log correlation & cross-service dependency tracing..."})
                    
                    snapshot = {
                        "global": self.metrics,
                        "services": self.services,
                        "scenario": self.active_scenario_name
                    }
                    
                    # Async AI generation (Gemini or local SRE fallback)
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
                    await self.broadcast("status_change", {"state": self.state, "message": "AI Copilot analysis ready. Root Cause Identified."})
            
            elif self.state == "RCA_GENERATED":
                 self._cascade_failure()
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
                self.metrics["latency"] = max(18, self.metrics["latency"] - 600)
                self.metrics["cpu"] = max(22, self.metrics["cpu"] - 20)
                self.metrics["errors"] = max(0.1, self.metrics["errors"] - 18.0)
                
                for k, v in self.services.items():
                    self.services[k]["latency"] = max(5, self.services[k]["latency"] - 300)
                    self.services[k]["cpu"] = max(10, self.services[k]["cpu"] - 15)
                    self.services[k]["errors"] = max(0, self.services[k]["errors"] - 10.0)
                    if self.services[k]["latency"] < 100:
                        self.services[k]["status"] = "healthy"
                
                if self.metrics["latency"] < 100:
                    self.state = "RESOLVED"
                    self.active_incident["status"] = "resolved"
                    await self._update_db_incident_status(self.active_incident["id"], "resolved")
                    await self.broadcast("incident_resolved", self.active_incident)
                    await self.broadcast("status_change", {"state": self.state, "message": "System stabilized. Incident successfully resolved."})
                    
            elif self.state == "RESOLVED":
                self._tick_telemetry_healthy()
                if random.random() < 0.15:
                    self.state = "HEALTHY"
                    self.active_incident = None
                    self.failing_service = None
                    self.active_scenario_name = None

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
            await self._update_db_incident_status(self.active_incident["id"], "resolved") # db status resolved
            await self.broadcast("status_change", {"state": self.state, "message": "Applying AI-suggested remediation playbook commands..."})
            return True
        return False
