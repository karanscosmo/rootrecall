from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class PostmortemCreate(BaseModel):
    incidentId: str = Field(..., max_length=100)
    incident_summary: str = Field(..., max_length=5000)
    root_cause: str = Field(..., max_length=5000)
    impact_analysis: str = Field(..., max_length=5000)
    affected_systems: list = Field(default=[], max_length=100)
    timeline_of_events: list = Field(default=[], max_length=500)
    recovery_duration: str = Field(..., max_length=500)
    resolution_steps: list = Field(default=[], max_length=500)
    lessons_learned: list = Field(default=[], max_length=500)
    preventive_recommendations: list = Field(default=[], max_length=500)
    future_risk_probability: str = Field(..., max_length=500)

class SettingsUpdate(BaseModel):
    key: str = Field(..., max_length=100)
    value: Dict[str, Any]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., max_length=150)
    company: str = Field(..., max_length=150)
    role: str = Field(..., max_length=50)

class GoogleLoginRequest(BaseModel):
    email: EmailStr
    name: str = Field(default="Google User", max_length=150)
    secret: str

class IncidentResponse(BaseModel):
    id: str
    title: str
    service: str
    severity: str
    status: str
    startedAt: Optional[str] = None
    impact: str
    aiConfidence: int
    rootCause: str
    remediationSteps: list
    replayAvailable: bool
    postmortemGenerated: bool

class PostmortemResponse(BaseModel):
    id: int
    incidentId: str
    incidentTitle: str
    severity: str
    service: str
    incidentSummary: str
    rootCause: str
    impactAnalysis: str
    affectedSystems: list
    timelineOfEvents: list
    recoveryDuration: str
    resolutionSteps: list
    lessonsLearned: list
    preventiveRecommendations: list
    futureRiskProbability: str
    createdAt: Optional[str] = None

class MemoryResponse(BaseModel):
    patternId: str
    description: str
    similarity: int
    occurrences: int
    lastSeen: Optional[str] = None
    recommendation: str
    relatedIncidents: list

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    incidentId: Optional[str] = Field(None, max_length=50)

class ChatResponse(BaseModel):
    content: str
    confidence: float
    hasCode: bool
    codeBlock: Optional[str] = None
    recurrence_probability: Optional[str] = None
    operational_impact: Optional[str] = None
