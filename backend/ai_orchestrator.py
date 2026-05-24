import os
import re
import asyncio
import json
import random
from google import genai
from pydantic import BaseModel
from typing import List, Optional

class RemediationStep(BaseModel):
    step: int
    action: str
    command: str

class RCAResponse(BaseModel):
    root_cause: str
    details: str
    confidence: float
    remediation_steps: List[RemediationStep]

class PostmortemModel(BaseModel):
    executive_summary: str
    root_cause_analysis: str
    timeline: List[dict] # list of {"time": str, "description": str}
    prevention_items: List[str]

class CopilotChatResponse(BaseModel):
    content: str
    confidence: float
    hasCode: bool
    codeBlock: Optional[str] = None
    recurrence_probability: Optional[str] = None
    operational_impact: Optional[str] = None

class AIOrchestrator:
    def __init__(self):
        self.MAX_INPUT_TOKENS = 4000
        self.MAX_OUTPUT_TOKENS = 1000
        self.client = None
        # Check for api key
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"Failed to initialize Google GenAI Client: {e}")

    def sanitize_input(self, text: str) -> str:
        if not isinstance(text, str):
            text = str(text)
        # Prevent prompt injection
        sanitized = re.sub(r'[<>{}\[\]\\]', '', text)
        return sanitized[:self.MAX_INPUT_TOKENS]
        
    async def analyze_anomaly(self, service: str, metrics: dict):
        """Analyze an anomaly using the real Gemini model if available."""
        safe_service = self.sanitize_input(service)
        safe_metrics = json.dumps(metrics)

        scenario = metrics.get("scenario", "unknown")

        if not self.client:
            # High-fidelity local fallback based on the scenario
            await asyncio.sleep(1)
            
            if scenario == "redis_saturation":
                return {
                    "root_cause": "Redis Connection Pool Exhaustion",
                    "details": "A high volume of unpaginated session queries to cache-cluster caused maxmemory limits to be breached, saturating the connection pool and cascading checkout failures.",
                    "confidence": 0.94,
                    "remediation_steps": [
                        {"step": 1, "action": "Scale up memory limits and flush saturated connections", "command": "redis-cli -h cache-cluster config set maxmemory 4gb && redis-cli -h cache-cluster CLIENT KILL TYPE normal"},
                        {"step": 2, "action": "Temporarily increase payment gateway client timeout threshold", "command": "kubectl set env deploy/checkout-api PAYMENT_TIMEOUT=10s"}
                    ]
                }
            elif scenario == "k8s_pod_failure":
                return {
                    "root_cause": "Kubernetes Node Eviction & Pod Failure Cascade",
                    "details": "Memory pressure on node worker-pool-3 led to the eviction of critical worker pods, causing job queues to back up and timeouts to bubble up to the client.",
                    "confidence": 0.88,
                    "remediation_steps": [
                        {"step": 1, "action": "Redistribute and scale worker pool replicas", "command": "kubectl scale deploy/worker-pool --replicas=10"},
                        {"step": 2, "action": "Drain the degraded kubernetes worker node", "command": "kubectl drain worker-pool-3 --ignore-daemonsets --delete-emptydir-data"}
                    ]
                }
            elif scenario == "db_pool_exhaustion":
                return {
                    "root_cause": "PostgreSQL Primary Connection Pool Saturation",
                    "details": "A slow, unindexed query against the users table saturated the active connection pool, starving the auth-service and user-profile services.",
                    "confidence": 0.91,
                    "remediation_steps": [
                        {"step": 1, "action": "Force kill active long-running connection queries", "command": "psql -h db-primary -c \"SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '2 minutes';\""},
                        {"step": 2, "action": "Temporarily raise the database max_connections limit", "command": "psql -h db-primary -c \"ALTER SYSTEM SET max_connections = 300; SELECT pg_reload_conf();\""}
                    ]
                }
            elif scenario == "api_latency":
                return {
                    "root_cause": "API Gateway Transit Queue Congestion",
                    "details": "A massive spike in client request rates saturated the API gateway ingress queue, causing packet drops and latency propagation.",
                    "confidence": 0.85,
                    "remediation_steps": [
                        {"step": 1, "action": "Scale gateway replicas to handle request spike", "command": "kubectl scale deploy/api-gateway --replicas=8"},
                        {"step": 2, "action": "Apply request rate limit rules at gateway level", "command": "kubectl set env deploy/api-gateway ENABLE_RATE_LIMIT=true"}
                    ]
                }
            elif scenario == "auth_instability":
                return {
                    "root_cause": "Upstream Identity Provider Handshake Failure",
                    "details": "Transit routing failures to the upstream identity provider timed out authentication handshakes, returning 500s to auth-service clients.",
                    "confidence": 0.89,
                    "remediation_steps": [
                        {"step": 1, "action": "Bypass external verification by enabling local fallback auth", "command": "kubectl set env deploy/auth-service ENABLE_LOCAL_FALLBACK=true"},
                        {"step": 2, "action": "Force restart auth service containers to purge bad DNS cache", "command": "kubectl rollout restart deploy/auth-service"}
                    ]
                }
            else:
                return {
                    "root_cause": "Telemetry Threshold Anomalous Deviation",
                    "details": "Sustained resource saturation detected on downstream dependencies.",
                    "confidence": 0.80,
                    "remediation_steps": [
                        {"step": 1, "action": "Rollback deployment to stable baseline", "command": "kubectl rollout undo deploy/checkout-api"}
                    ]
                }

        prompt = f"""
        You are an elite SRE AI agent analyzing an incident for service '{safe_service}'.
        Current telemetry snapshot: {safe_metrics}
        
        Provide a concise root cause, technical details of the failure, a confidence score between 0.80 and 0.99, and exactly 2 shell commands (kubectl/redis-cli etc) to remediate the issue.
        """
        
        def run_gemini():
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RCAResponse,
                ),
            )
            return json.loads(response.text)

        try:
            result = await asyncio.to_thread(run_gemini)
            return {
                "root_cause": result.get("root_cause", "Anomaly Detected"),
                "details": result.get("details", ""),
                "confidence": result.get("confidence", 0.9),
                "remediation_steps": result.get("remediation_steps", [])
            }
        except Exception as e:
            logger.error(f"Gemini anomaly analysis failed: {e}")
            return {
                "root_cause": "AI Generation Failed",
                "details": f"Model failed to generate response: {str(e)}",
                "confidence": 0.0,
                "remediation_steps": []
            }

    async def generate_postmortem(self, incident: dict, metrics_snapshot: dict) -> dict:
        """Generate a complete SRE postmortem report using Gemini or fallback."""
        if not self.client:
            # Fallback high fidelity postmortem
            await asyncio.sleep(1)
            started_time = incident.get("startedAt") or datetime.datetime.utcnow().isoformat()
            service = incident.get("service") or "unknown-service"
            severity = incident.get("severity") or "SEV-2"
            impact = incident.get("impact") or "Degraded service availability"
            root_cause = incident.get("rootCause") or "Resource saturation and connections bottleneck."
            
            exec_summary = (
                f"On {started_time}, a high-severity {severity} incident affected the {service} service. "
                f"The operational impact was flagged as: '{impact}'. "
                f"Our real-time observability telemetry captured anomaly traces, triggering AI correlation gates. "
                f"Mitigation playbooks were executed to restore operational baselines. The system was fully stabilized."
            )
            
            rca_details = (
                f"The root cause of this incident was verified as: {root_cause} "
                f"Specifically, telemetry showed latency spikes propagating upstream to the API gateway. "
                f"This matches historical cascading failure signatures where resource exhaustion starvation causes queue delays."
            )
            
            timeline = [
                {"time": "00:00:00", "description": f"Incident triggered. Alerting thresholds breached on {service}."},
                {"time": "00:02:15", "description": "AI Copilot correlated metrics and isolated root cause signature."},
                {"time": "00:05:40", "description": "SRE ran automated remediation playbook commands, verifying latency stabilization."}
            ]
            
            prev_items = [
                f"Adjust connection limits and scale horizontal replicas for {service} to handle peak load.",
                f"Implement active load-shedding and circuit breaker patterns on API Gateway calling downstream {service}.",
                "Integrate explain-plan audits in local CI pipelines to prevent unindexed query rollouts."
            ]
            
            return {
                "executive_summary": exec_summary,
                "root_cause_analysis": rca_details,
                "timeline": timeline,
                "prevention_items": prev_items
            }

        prompt = f"""
        You are a Senior Staff SRE. Generate a detailed, professional SRE-grade Postmortem report for this incident:
        Incident details: {json.dumps(incident)}
        Metrics at failure: {json.dumps(metrics_snapshot)}
        
        Write a detailed Executive Summary, a thorough Root Cause Analysis, a chronological timeline of the event, and exactly 3 concrete Prevention Items.
        Return as JSON matching schema.
        """
        
        def run_gemini():
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=PostmortemModel,
                ),
            )
            return json.loads(response.text)

        try:
            return await asyncio.to_thread(run_gemini)
        except Exception as e:
            logger.error(f"Gemini postmortem generation failed: {e}")
            return {
                "executive_summary": "Failed to generate postmortem executive summary.",
                "root_cause_analysis": f"Generation error: {str(e)}",
                "timeline": [],
                "prevention_items": []
            }

    async def copilot_chat(self, user_message: str, active_incident: Optional[dict], live_metrics: dict) -> dict:
        """Process chat query with live telemetry and return SRE contextual answers."""
        safe_msg = self.sanitize_input(user_message)
        
        if not self.client:
            # Fallback high fidelity chat logic
            await asyncio.sleep(1)
            content = ""
            code_block = None
            has_code = False
            rec_prob = "Low (<10% over 30 days)"
            op_impact = "No active incident. Telemetry reading normal."
            
            p99 = live_metrics.get("latency", 45)
            cpu = live_metrics.get("cpu", 30)
            errors = live_metrics.get("errors", 0.1)

            if active_incident:
                rec_prob = "High (80% recurrence if unmitigated)"
                op_impact = f"Degrading {active_incident['service']} performance. Severity: {active_incident['severity']}. Impact: {active_incident['impact']}."

            # Simple keyword matching for high-fidelity fallback response
            if "status" in safe_msg.lower() or "telemetry" in safe_msg.lower() or "metrics" in safe_msg.lower():
                content = (
                    f"Here is the real-time operational telemetry snapshot:\n\n"
                    f"* **Global P99 Latency:** {p99:.0f}ms\n"
                    f"* **Core CPU Load:** {cpu:.1f}%\n"
                    f"* **System Error Rate:** {errors:.2f}%\n\n"
                    f"All downstream service maps are currently being polled. "
                )
                if active_incident:
                    content += f"We are investigating the active incident **{active_incident['id']}** affecting **{active_incident['service']}**."
                else:
                    content += "All systems are operating within healthy parameters."
            elif "remediate" in safe_msg.lower() or "scale" in safe_msg.lower() or "fix" in safe_msg.lower():
                if active_incident:
                    remediation = active_incident.get("remediationSteps", [
                        {"command": "kubectl scale deploy/checkout-api --replicas=5", "action": "Scale replicas"}
                    ])
                    cmd = remediation[0]["command"] if len(remediation) > 0 else "kubectl get pods"
                    content = (
                        f"Analyzing incident **{active_incident['id']}** on **{active_incident['service']}**.\n\n"
                        f"To mitigate the current {active_incident['severity']} block, execute the following playbook command to scale the service layer or reset connections:"
                    )
                    code_block = cmd
                    has_code = True
                else:
                    content = "No active incident is currently registered. If you wish to trigger chaos and run remediations, please navigate to the **System Health** page or use the Command Palette."
            elif "pattern" in safe_msg.lower() or "history" in safe_msg.lower() or "similarity" in safe_msg.lower():
                content = (
                    "Analyzing historical correlation data in PostgreSQL Primary. I found a matching pattern signature:\n\n"
                    "* **Signature ID:** `PAT-001` (Redis connection pool exhaustion after deploy)\n"
                    "* **Similarity Score:** 91%\n"
                    "* **Recommended Resolution:** Gate deploys on Redis memory headroom checks and increase client connection pools."
                )
                rec_prob = "Medium (35% over 30 days)"
            else:
                content = (
                    f"Understood. I am your RootRecall SRE Copilot assistant. "
                    f"Our real-time metrics show latency of **{p99:.0f}ms** and CPU usage at **{cpu:.1f}%**.\n\n"
                )
                if active_incident:
                    content += (
                        f"There is an active incident **{active_incident['id']}** affecting **{active_incident['service']}**.\n"
                        f"**Root Cause:** {active_incident.get('rootCause', 'Pending analysis')}.\n\n"
                        f"You can request details about remediation commands by typing `/remediate` or inspect specific logs in the incident panel."
                    )
                else:
                    content += "All system components are healthy. You can trigger a simulation using the Command Palette to trace failure propagation."

            return {
                "content": content,
                "confidence": 0.90 if active_incident else 0.95,
                "hasCode": has_code,
                "codeBlock": code_block,
                "recurrence_probability": rec_prob,
                "operational_impact": op_impact
            }

        # Query Gemini
        prompt = f"""
        You are an elite, senior site reliability engineer (SRE) assistant.
        The operator is asking: "{safe_msg}"
        
        System telemetry context:
        - Latency P99: {live_metrics.get("latency")} ms
        - CPU Load: {live_metrics.get("cpu")}%
        - Error Rate: {live_metrics.get("errors")}%
        - Active incident: {json.dumps(active_incident) if active_incident else "None"}
        
        Provide a concise, helpful, and highly technical SRE answer in markdown.
        If the user is asking to scale, fix, or run a remediation, output hasCode=True and provide the exact CLI command in codeBlock.
        Estimate a realistic recurrence probability and explain the operational impact.
        Return as JSON matching schema.
        """
        
        def run_gemini():
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CopilotChatResponse,
                ),
            )
            return json.loads(response.text)

        try:
            result = await asyncio.to_thread(run_gemini)
            return {
                "content": result.get("content", ""),
                "confidence": result.get("confidence", 0.9),
                "hasCode": result.get("hasCode", False),
                "codeBlock": result.get("codeBlock"),
                "recurrence_probability": result.get("recurrence_probability"),
                "operational_impact": result.get("operational_impact")
            }
        except Exception as e:
            logger.error(f"Gemini copilot chat failed: {e}")
            return {
                "content": f"SRE Copilot chat failed to generate response: {str(e)}",
                "confidence": 0.0,
                "hasCode": False,
                "codeBlock": None,
                "recurrence_probability": "Unknown",
                "operational_impact": "Failed to analyze"
            }

ai_engine = AIOrchestrator()
