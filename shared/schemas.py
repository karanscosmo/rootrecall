from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class IncidentSchema(BaseModel):
    id: str
    title: str
    service: str
    severity: str
    status: str
    startedAt: datetime
    resolvedAt: Optional[datetime] = None
    duration: Optional[str] = None
    impact: str
    aiConfidence: float
    rootCause: str
    affectedServices: List[str]
    replayAvailable: bool
    postmortemGenerated: bool

class MetricSchema(BaseModel):
    timestamp: int
    latencyP99: float
    errorRate: float
    cpuUsage: float
    memoryUsage: float
    requestRate: float

class DeploymentSchema(BaseModel):
    id: str
    service: str
    version: str
    deployedAt: datetime
    deployedBy: str
    status: str
    triggeredIncident: Optional[str] = None

class AIMemorySchema(BaseModel):
    patternId: str
    description: str
    similarity: float
    occurrences: int
    lastSeen: datetime
    recommendation: str
    relatedIncidents: List[str]

class TelemetryEventSchema(BaseModel):
    type: str
    timestamp: str
    data: dict
