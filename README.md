# RootRecall

**Next-Gen AI Incident Intelligence & Observability Platform**

RootRecall translates chaotic infrastructure telemetry into structured operational intelligence. Designed for modern SRE and platform engineering teams, RootRecall correlates high-cardinality system metrics, identifies cascading failure vectors, automates root cause analyses (RCA) via Gemini, and generates production-ready postmortem reports in real-time.

---

## 🌟 Platform Capabilities

### 1. Centralized Telemetry Orchestration
All metric streams are unified. Unlike traditional fragmented dashboards, a deployment anomaly automatically triggers downstream dependency analysis, maps service degradations, notifies engineering, updates incident state machines, and constructs chronological replay timelines.

### 2. High-Fidelity Incident Replay (Story Mode)
Reconstruct failures step-by-step. Engineers can scrub through historic timelines to view synchronized state charts, see topological flow changes in real-time, and read contextual AI narration summarizing exactly what happened and when.

### 3. Contextual SRE Copilot
A conversational assistant that is deeply infrastructure-aware. The copilot accesses active logs, resource configurations, and database metrics to recommend precise CLI remediations (e.g. `kubectl` scaling/rollback commands) and predict incident recurrence probability.

### 4. Automated Postmortem Reports
Say goodbye to blank Google Docs. RootRecall compiles SRE-grade Markdown reports detailing executive summaries, root cause analyses, incident timelines, and actionable prevention items derived directly from simulated or live incident telemetry.

---

## 🏗️ Technical Architecture

### Frontend Layer
- **Framework:** Next.js (App Router)
- **State Management:** Zustand (reactive client cache)
- **Charts & Topology:** Recharts & dynamic SVG layout engines
- **Authentication:** NextAuth.js (JWT strategy with Google OAuth & Credentials fallback)
- **Ambience:** Lazy loaded cinematic GPU-efficient backdrops

### Backend & Simulation Layer
- **API Engine:** FastAPI (Python 3.13) with SQLAlchemy ORM connection pooling
- **Telemetry Stream:** High-throughput WebSockets with exponential backoff client reconnects
- **AI Engine:** Google Gemini (`gemini-2.5-flash`) via the Google GenAI SDK
- **Rate-Limiting:** SlowAPI (configured for production throttling)

---

## 🚀 Local Development Setup

### 1. Backend Server Setup
Navigate to the `backend/` directory, set up your virtual environment, and boot the server:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment variables
export DATABASE_URL="sqlite:///./rootrecall.db"
export SECRET_KEY="your-production-secret-key"
export ALGORITHM="HS256"
export GEMINI_API_KEY="your-gemini-api-key"
export INTERNAL_AUTH_SECRET="sync-secret-with-nextauth"

uvicorn main:app --reload --port 8000
```

### 2. Frontend Next.js Setup
Navigate to the `frontend/` directory, install packages, and boot the client dev server:
```bash
cd frontend
npm install

# Configure environment variables
export NEXTAUTH_SECRET="same-production-secret-key-as-backend"
export NEXTAUTH_URL="http://localhost:3000"
export NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
export NEXT_PUBLIC_WS_URL="ws://localhost:8000/ws/telemetry"
export INTERNAL_AUTH_SECRET="sync-secret-with-nextauth"

npm run dev
```
Open `http://localhost:3000` in your browser and sign in with the default credentials (`admin@rootrecall.com` / `securepassword123`) or via Google OAuth.

---

## 🛡️ Production Deployments

RootRecall is built deploy-ready for modern cloud environments:

### Frontend (Vercel)
The client builds cleanly using standard Next.js compilation targets.
1. Link your repository in Vercel.
2. Inject required environment variables (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `INTERNAL_AUTH_SECRET`).
3. Deploy.

### Backend (Railway / Render)
We include configuration manifests for instant container deployment.
- **Railway:** Uses the configured `railway.json` and `Procfile`. Link the backend folder, bind port `8000`, configure your PostgreSQL database instance, and map `DATABASE_URL`.
- **Render:** Refer to the root `render.yaml` template to instantiate high-performance Python services.

---

## 🛡️ Security Policy & Hardening
- **CSP Headers:** Embedded inside `next.config.ts` headers to enforce strict frame-ancestor rules and secure WebSocket protocols (`wss:`).
- **XSS Protections:** HTML elements rendering markdown inputs are automatically sanitized using `DOMPurify`.
- **SQLi Protections:** Parameterized ORM queries bind user values automatically to prevent script injection.
- **Rate Limiting:** Core triggers and chat inputs are bounded using FastAPI endpoint limits.
