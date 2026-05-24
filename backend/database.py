from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import structlog

logger = structlog.get_logger()

import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rootrecall.db")

# Standardize older postgres:// scheme to postgresql:// for SQLAlchemy compatibility
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    service = Column(String, index=True)
    severity = Column(String)  # SEV-1, SEV-2, etc.
    status = Column(String)    # Active, Resolved, Investigating
    impact = Column(String)    # High, Medium, Low
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    duration_seconds = Column(Integer, default=0)
    root_cause = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    remediation_steps = Column(JSON, nullable=True)
    is_simulated = Column(Boolean, default=False)

class Postmortem(Base):
    __tablename__ = "postmortems"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer)
    executive_summary = Column(String)
    timeline = Column(JSON)
    root_cause_analysis = Column(String)
    prevention_items = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    company = Column(String)
    role = Column(String, default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class OperationalMemory(Base):
    __tablename__ = "operational_memory"

    id = Column(Integer, primary_key=True, index=True)
    pattern_signature = Column(String, unique=True, index=True)
    description = Column(String)
    occurrences = Column(Integer, default=1)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    resolution = Column(String)

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)

Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        # Check if database is empty
        if db.query(User).count() == 0:
            logger.info("Seeding admin user...")
            import bcrypt
            hashed_pw = bcrypt.hashpw("securepassword123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin = User(
                email="admin@rootrecall.com",
                hashed_password=hashed_pw,
                name="Admin User",
                company="RootRecall AI",
                role="admin"
            )
            db.add(admin)

        if db.query(Incident).count() == 0:
            logger.info("Seeding database with default incidents...")
            incidents_to_seed = [
                Incident(
                    id=8241,
                    title="Payment Gateway Timeout Cascade",
                    service="services/checkout-api",
                    severity="SEV-1",
                    status="Active",
                    impact="100% checkout failure, ~$3.2k/min revenue loss",
                    is_simulated=False,
                    root_cause="Redis connection pool exhaustion on cache-cluster-02 after auth-service v2.4.1 deploy introduced unpaginated query",
                    confidence=0.94,
                    remediation_steps=[
                        {"step": 1, "action": "Increase timeout threshold temporarily", "command": "kubectl set env deploy/checkout-api PAYMENT_TIMEOUT=10s"},
                        {"step": 2, "action": "Scale up replicas to handle backlog", "command": "kubectl scale deploy/checkout-api --replicas=10"}
                    ]
                ),
                Incident(
                    id=8239,
                    title="Auth Service Latency Spike",
                    service="services/auth-service",
                    severity="SEV-2",
                    status="Investigating",
                    impact="P99 latency > 2000ms, login degraded",
                    is_simulated=False,
                    root_cause="DB connection pool saturation — 87% similar to INC-2023-08-12",
                    confidence=0.87,
                    remediation_steps=[
                        {"step": 1, "action": "Scale auth pods", "command": "kubectl scale deploy/auth-service --replicas=5"},
                        {"step": 2, "action": "Flush connections", "command": "pg_ctl restart"}
                    ]
                ),
                Incident(
                    id=8201,
                    title="Elevated 5xx Error Rate",
                    service="services/user-profile",
                    severity="SEV-3",
                    status="Resolved",
                    impact="~12% of profile API requests failing",
                    is_simulated=False,
                    root_cause="Downstream database slow query from unindexed column join",
                    confidence=0.78,
                    remediation_steps=[
                        {"step": 1, "action": "Rollback deployment", "command": "kubectl rollout undo deploy/user-profile"},
                        {"step": 2, "action": "Add missing index (async)", "command": "CREATE INDEX idx_user_last_login ON users(last_login);"}
                    ]
                )
            ]
            for inc in incidents_to_seed:
                db.add(inc)

        if db.query(OperationalMemory).count() == 0:
            print("Seeding database with operational memory patterns...")
            patterns = [
                OperationalMemory(
                    pattern_signature="PAT-001",
                    description="Redis connection pool exhaustion after deploy",
                    occurrences=4,
                    resolution="Gate deploys on Redis memory headroom check (>20%). Enable connection pool monitoring alerts at 80% saturation."
                ),
                OperationalMemory(
                    pattern_signature="PAT-002",
                    description="Unpaginated DB query spike on high-traffic tables",
                    occurrences=3,
                    resolution="Mandate EXPLAIN plan analysis in CI for queries touching tables >100k rows."
                ),
                OperationalMemory(
                    pattern_signature="PAT-003",
                    description="Deployment-triggered cascading failure pattern",
                    occurrences=6,
                    resolution="Implement canary deploy gates with automated rollback on P99 threshold breach within 5 minutes."
                )
            ]
            for pat in patterns:
                db.add(pat)

        if db.query(Postmortem).count() == 0:
            print("Seeding database with default postmortems...")
            postmortems_to_seed = [
                Postmortem(
                    incident_id=8201,
                    executive_summary="On 2026-05-23, user-profile API latency spike caused elevated 5xx error rate affecting ~12% of traffic.",
                    timeline=[
                        {"time": "14:02 UTC", "description": "Alert triggered for elevated 5xx error rate on user-profile API"},
                        {"time": "14:05 UTC", "description": "AI Copilot isolated issue to a slow DB query on users table"},
                        {"time": "14:15 UTC", "description": "SRE rolled back deployment to v1.2.3, error rate normalized"}
                    ],
                    root_cause_analysis="A recent deployment introduced a new query that performed a full table scan on the users table due to a missing index on last_login column.",
                    prevention_items=[
                        "Add missing index idx_user_last_login on users(last_login)",
                        "Add query validation explain check in CI pipelines"
                    ]
                )
            ]
            for pm in postmortems_to_seed:
                db.add(pm)

        if db.query(SystemSettings).count() == 0:
            print("Seeding database with default settings...")
            default_settings = [
                SystemSettings(key="integrations", value={
                    "slack": {"connected": True, "channel": "#incidents-live"},
                    "pagerduty": {"connected": True, "service": "Primary SRE Pool"},
                    "github": {"connected": True, "repo": "RootRecall/core"},
                    "kubernetes": {"connected": True, "cluster": "prod-us-east-1"},
                    "datadog": {"connected": False},
                    "grafana": {"connected": False}
                }),
                SystemSettings(key="ai_preferences", value={
                    "autoRemediate": False,
                    "confidenceThreshold": 0.85,
                    "model": "gemini-3.5-flash"
                }),
                SystemSettings(key="profile", value={
                    "name": "Karan Sharma",
                    "email": "karan@rootrecall.ai",
                    "role": "SRE Lead"
                })
            ]
            for setting in default_settings:
                db.add(setting)

        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

