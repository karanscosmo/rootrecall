from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio
import json

from database import engine, Base, SessionLocal, Incident, Postmortem, OperationalMemory, SystemSettings, seed_database
from ai_orchestrator import ai_engine
from simulation_engine import SimulationEngine

app = FastAPI(title="RootRecall API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulation = SimulationEngine(ai_engine)

@app.on_event("startup")
async def startup_event():
    seed_database()
    simulation.start()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Schemas ───

class PostmortemCreate(BaseModel):
    incidentId: str
    executiveSummary: str
    rootCauseAnalysis: str
    timeline: list = []
    preventionItems: list = []

class SettingsUpdate(BaseModel):
    key: str
    value: dict

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    company: str
    role: str

# ─── Endpoints ───

@app.get("/health")
def health_check():
    return {"status": "ok", "state": simulation.state}

@app.post("/api/demo/trigger")
async def trigger_demo():
    success = await simulation.trigger_demo()
    if not success:
        raise HTTPException(status_code=400, detail="Cannot trigger demo. System not in HEALTHY state.")
    return {"status": "Demo triggered"}

@app.post("/api/demo/remediate")
async def apply_remediation():
    success = await simulation.apply_remediation()
    if not success:
        raise HTTPException(status_code=400, detail="Cannot apply remediation at this state.")
    return {"status": "Remediation started"}

@app.get("/api/incidents")
def get_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.id.desc()).all()
    res = []
    for inc in incidents:
        # Sync live status if this incident is currently active in the simulation engine
        status = inc.status.lower()
        root_cause = inc.root_cause or ""
        confidence = int(inc.confidence * 100) if inc.confidence else 0
        remediation_steps = inc.remediation_steps or []

        if simulation.active_incident and simulation.active_incident["id"] == f"INC-{inc.id}":
            status = simulation.state.lower()
            if status == "healthy":
                status = "resolved"
            elif status in ["deployment", "anomaly", "rca_generated"]:
                status = "active"
            elif status == "remediating":
                status = "mitigated"

            if simulation.active_incident.get("root_cause"):
                root_cause = simulation.active_incident["root_cause"]
            if simulation.active_incident.get("confidence"):
                confidence = int(simulation.active_incident["confidence"] * 100)
            if simulation.active_incident.get("remediation_steps"):
                remediation_steps = simulation.active_incident["remediation_steps"]

        res.append({
            "id": f"INC-{inc.id}",
            "title": inc.title if status != "active" or not root_cause else root_cause,
            "service": inc.service,
            "severity": inc.severity,
            "status": status,
            "startedAt": inc.start_time.isoformat() + "Z" if inc.start_time else None,
            "impact": inc.impact,
            "aiConfidence": confidence,
            "rootCause": root_cause,
            "remediationSteps": remediation_steps,
            "replayAvailable": True,
            "postmortemGenerated": db.query(Postmortem).filter(Postmortem.incident_id == inc.id).count() > 0
        })
    return res

@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    try:
        clean_id = int(incident_id.replace("INC-", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID format")
    
    inc = db.query(Incident).filter(Incident.id == clean_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    status = inc.status.lower()
    root_cause = inc.root_cause or ""
    confidence = int(inc.confidence * 100) if inc.confidence else 0
    remediation_steps = inc.remediation_steps or []
    
    if simulation.active_incident and simulation.active_incident["id"] == incident_id:
        status = simulation.state.lower()
        if status == "healthy":
            status = "resolved"
        elif status in ["deployment", "anomaly", "rca_generated"]:
            status = "active"
        elif status == "remediating":
            status = "mitigated"

        if simulation.active_incident.get("root_cause"):
            root_cause = simulation.active_incident["root_cause"]
        if simulation.active_incident.get("confidence"):
            confidence = int(simulation.active_incident["confidence"] * 100)
        if simulation.active_incident.get("remediation_steps"):
            remediation_steps = simulation.active_incident["remediation_steps"]
            
    return {
        "id": f"INC-{inc.id}",
        "title": inc.title if status != "active" or not root_cause else root_cause,
        "service": inc.service,
        "severity": inc.severity,
        "status": status,
        "startedAt": inc.start_time.isoformat() + "Z" if inc.start_time else None,
        "impact": inc.impact,
        "aiConfidence": confidence,
        "rootCause": root_cause,
        "remediationSteps": remediation_steps,
        "replayAvailable": True,
        "postmortemGenerated": db.query(Postmortem).filter(Postmortem.incident_id == inc.id).count() > 0
    }

@app.get("/api/postmortems")
def get_postmortems(db: Session = Depends(get_db)):
    postmortems = db.query(Postmortem).all()
    res = []
    for pm in postmortems:
        inc = db.query(Incident).filter(Incident.id == pm.incident_id).first()
        title = inc.title if inc else "Unknown Incident"
        severity = inc.severity if inc else "SEV-2"
        service = inc.service if inc else "unknown-service"
        res.append({
            "id": pm.id,
            "incidentId": f"INC-{pm.incident_id}",
            "incidentTitle": title,
            "severity": severity,
            "service": service,
            "executiveSummary": pm.executive_summary,
            "timeline": pm.timeline or [],
            "rootCauseAnalysis": pm.root_cause_analysis,
            "preventionItems": pm.prevention_items or [],
            "createdAt": pm.created_at.isoformat() + "Z" if pm.created_at else None
        })
    return res

@app.post("/api/postmortems")
def create_postmortem(pm_data: PostmortemCreate, db: Session = Depends(get_db)):
    try:
        clean_inc_id = int(pm_data.incidentId.replace("INC-", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID format")
        
    existing = db.query(Postmortem).filter(Postmortem.incident_id == clean_inc_id).first()
    if existing:
        existing.executive_summary = pm_data.executiveSummary
        existing.root_cause_analysis = pm_data.rootCauseAnalysis
        existing.timeline = pm_data.timeline
        existing.prevention_items = pm_data.preventionItems
        db.commit()
        db.refresh(existing)
        return {"status": "updated", "id": existing.id}
    
    new_pm = Postmortem(
        incident_id=clean_inc_id,
        executive_summary=pm_data.executiveSummary,
        root_cause_analysis=pm_data.rootCauseAnalysis,
        timeline=pm_data.timeline,
        prevention_items=pm_data.preventionItems
    )
    db.add(new_pm)
    db.commit()
    db.refresh(new_pm)
    return {"status": "created", "id": new_pm.id}

@app.get("/api/memory")
def get_memory(db: Session = Depends(get_db)):
    patterns = db.query(OperationalMemory).all()
    res = []
    for pat in patterns:
        related = ["INC-8241", "INC-8150"] if "Redis" in pat.description else ["INC-8239", "INC-8201"]
        res.append({
            "patternId": pat.pattern_signature,
            "description": pat.description,
            "similarity": 91 if "Redis" in pat.description else (87 if "DB" in pat.description else 78),
            "occurrences": pat.occurrences,
            "lastSeen": pat.last_seen.isoformat() + "Z" if pat.last_seen else None,
            "recommendation": pat.resolution,
            "relatedIncidents": related
        })
    return res

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).all()
    res = {}
    for s in settings:
        res[s.key] = s.value
    return res

@app.post("/api/settings")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    s = db.query(SystemSettings).filter(SystemSettings.key == data.key).first()
    if s:
        s.value = data.value
    else:
        s = SystemSettings(key=data.key, value=data.value)
        db.add(s)
    db.commit()
    return {"status": "success"}

@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    return {
        "status": "success",
        "token": "mock-jwt-token-xyz-123",
        "user": {
            "email": req.email,
            "name": "Karan Sharma",
            "role": "SRE Lead"
        }
    }

@app.post("/api/auth/signup")
def auth_signup(req: SignupRequest):
    return {
        "status": "success",
        "token": "mock-jwt-token-new-user",
        "user": {
            "email": req.email,
            "name": req.name,
            "company": req.company,
            "role": req.role
        }
    }

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue = asyncio.Queue()
    simulation.subscribe(queue)
    try:
        while True:
            event = await queue.get()
            await websocket.send_text(json.dumps(event))
    except WebSocketDisconnect:
        simulation.unsubscribe(queue)
        print("Client disconnected from telemetry stream")
