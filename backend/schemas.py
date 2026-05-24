from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class PostmortemCreate(BaseModel):
    incidentId: str = Field(..., max_length=100)
    executiveSummary: str = Field(..., max_length=5000)
    rootCauseAnalysis: str = Field(..., max_length=10000)
    timeline: list = Field(default=[], max_length=500)
    preventionItems: list = Field(default=[], max_length=100)

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
    executiveSummary: str
    timeline: list
    rootCauseAnalysis: str
    preventionItems: list
    createdAt: Optional[str] = None

class MemoryResponse(BaseModel):
    patternId: str
    description: str
    similarity: int
    occurrences: int
    lastSeen: Optional[str] = None
    recommendation: str
    relatedIncidents: list
