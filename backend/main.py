from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, APIRouter, Request, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session
import asyncio
import json
import os
import secure
import structlog
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import JWTError, jwt
import bcrypt
from datetime import datetime, timedelta

# ─── Secure Logging Config ───
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(sort_keys=True)
    ]
)
logger = structlog.get_logger()


from database import engine, Base, SessionLocal, Incident, Postmortem, OperationalMemory, SystemSettings, seed_database, User
from ai_orchestrator import ai_engine
from simulation_engine import SimulationEngine

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="RootRecall API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

secure_headers = secure.Secure(
    server=secure.Server().set("RootRecall-Enterprise-Server"),
    csp=secure.ContentSecurityPolicy().default_src("'self'").frame_ancestors("'none'").upgrade_insecure_requests(),
    hsts=secure.StrictTransportSecurity().include_subdomains().preload().max_age(31536000),
    referrer=secure.ReferrerPolicy().no_referrer(),
    cache=secure.CacheControl().no_cache().no_store().must_revalidate(),
    xss=secure.XXSSProtection().enable_block(),
    content_type=secure.XContentTypeOptions().nosniff(),
)

@app.middleware("http")
async def set_secure_headers(request, call_next):
    response = await call_next(request)
    secure_headers.set_headers(response)
    return response

# ─── Auth ───
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecret-default")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

# ─── Router ───
router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])
auth_router = APIRouter(prefix="/api/v1/auth")

simulation = SimulationEngine(ai_engine)

@app.on_event("startup")
async def startup_event():
    seed_database()
    simulation.start()

from schemas import PostmortemCreate, SettingsUpdate, LoginRequest, SignupRequest, GoogleLoginRequest, IncidentResponse, PostmortemResponse, MemoryResponse

# ─── Endpoints ───

@app.get("/health")
@limiter.limit("10/minute")
def health_check(request: Request):
    return {"status": "ok", "state": simulation.state}

@router.post("/demo/trigger")
@limiter.limit("5/minute")
async def trigger_demo(request: Request, current_user: User = Depends(get_current_admin)):
    success = await simulation.trigger_demo()
    if not success:
        raise HTTPException(status_code=400, detail="Cannot trigger demo. System not in HEALTHY state.")
    return {"status": "Demo triggered"}

@router.post("/demo/remediate")
@limiter.limit("5/minute")
async def apply_remediation(request: Request, current_user: User = Depends(get_current_admin)):
    success = await simulation.apply_remediation()
    if not success:
        raise HTTPException(status_code=400, detail="Cannot apply remediation at this state.")
    return {"status": "Remediation started"}

@router.get("/incidents", response_model=List[IncidentResponse])
@limiter.limit("60/minute")
def get_incidents(request: Request, db: Session = Depends(get_db)):
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

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
@limiter.limit("60/minute")
def get_incident(request: Request, incident_id: str, db: Session = Depends(get_db)):
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

@router.get("/postmortems", response_model=List[PostmortemResponse])
@limiter.limit("60/minute")
def get_postmortems(request: Request, db: Session = Depends(get_db)):
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

@router.post("/postmortems")
@limiter.limit("10/minute")
def create_postmortem(request: Request, pm_data: PostmortemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
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

@router.get("/memory", response_model=List[MemoryResponse])
@limiter.limit("60/minute")
def get_memory(request: Request, db: Session = Depends(get_db)):
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

@router.get("/settings")
@limiter.limit("60/minute")
def get_settings(request: Request, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).all()
    res = {}
    for s in settings:
        res[s.key] = s.value
    return res

@router.post("/settings")
@limiter.limit("10/minute")
def update_settings(request: Request, req: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    s = db.query(SystemSettings).filter(SystemSettings.key == req.key).first()
    if s:
        s.value = req.value
    else:
        s = SystemSettings(key=req.key, value=req.value)
        db.add(s)
    db.commit()
    return {"status": "success"}

@auth_router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "name": user.name, "role": user.role}}

@auth_router.post("/google")
@limiter.limit("10/minute")
def google_login(request: Request, req: GoogleLoginRequest, db: Session = Depends(get_db)):
    if req.secret != SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal secret")
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        user = User(email=req.email, name=req.name, company="", role="user", hashed_password=hash_password("google-auth-no-pass"))
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "name": user.name, "role": user.role}}

@auth_router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=req.email,
        name=req.name,
        company=req.company,
        role="user",
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "name": user.name, "role": user.role}}

app.include_router(auth_router)
app.include_router(router)

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    if origin and "localhost" not in origin and "rootrecall" not in origin:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    token = websocket.query_params.get("token")
    if not token:
        # In a strict production env, close here. For demo, we might allow it.
        # But per Phase 9 rules, we enforce auth.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    queue = asyncio.Queue()
    simulation.subscribe(queue)
    try:
        while True:
            event = await queue.get()
            await websocket.send_text(json.dumps(event))
    except WebSocketDisconnect:
        logger.info("Client disconnected from telemetry stream")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        simulation.unsubscribe(queue)
        logger.info("Cleaned up websocket queue")
