"""
Vercel ASGI entrypoint for RootRecall FastAPI backend.

NOTE: Vercel serverless functions do NOT support:
  - Long-running background threads (SimulationEngine)
  - Persistent WebSocket connections (/ws/telemetry)

On Vercel, the REST API routes (/incidents, /postmortems, /memory, /settings)
will work fully. The live telemetry WebSocket and background simulation engine
will NOT run — the dashboard will show stored/seed data only.

For full real-time functionality (WebSockets + simulation), deploy the backend on:
  - Railway: https://railway.app
  - Render:  https://render.com
  - Fly.io:  https://fly.io
"""

import sys
import os

# Add the backend root to the path so imports work correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: F401 — exported as the ASGI app for Vercel
