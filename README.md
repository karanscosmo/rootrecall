# RootRecall 🚀

**Enterprise AI Operations & Incident Intelligence Platform**

RootRecall is a centralized, AI-driven observability and operations platform designed for modern engineering teams. It transforms chaotic incidents into structured operational intelligence, allowing teams to diagnose, remediate, and learn from system failures faster than ever before.

## 🌟 Key Features

- **Real-Time Telemetry Engine:** Correlates high-cardinality metrics (Latency, CPU, Error Rates) across microservice topologies to identify anomalies instantly.
- **AI-Powered Diagnostics:** Powered by Gemini, the platform dynamically generates Root Cause Analyses (RCAs) and prescribes immediate mitigation steps (e.g., `kubectl` rollback commands) within seconds of an anomaly.
- **Cascading Failure Simulation:** An advanced backend engine maps out microservice dependency graphs, propagating realistic degradation scenarios to pressure-test the platform's response capabilities.
- **Executive vs. Technical Views:** Effortlessly switch between deep technical telemetry tailored for SREs and high-level risk/SLA exposure summaries designed for stakeholders.
- **Enterprise-Grade Security:** Hardened FastAPI backend enforcing strict Pydantic schemas, CSP headers, rate-limiting, and JWT-based NextAuth authentication.
- **Cinematic UI/UX:** Built on Next.js 14 and TailwindCSS, the interface provides a premium, lag-free experience featuring micro-animations, glassmorphism, and dynamic visual states.

## 🏗️ Architecture Stack

### Frontend
- Next.js 14 (App Router)
- React 18 & TypeScript
- TailwindCSS (Utility-first styling)
- Zustand (State Management)
- Recharts (Real-time telemetry charting)
- NextAuth.js (Enterprise Authentication)

### Backend
- FastAPI (High-performance API)
- Python 3.13
- SQLite & SQLAlchemy (Database ORM)
- Google GenAI (Gemini for RCA generation)
- WebSockets (Real-time metric streaming)

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- A Google Gemini API Key (optional but recommended for real AI generation)

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set environment variables
export GEMINI_API_KEY="your-gemini-key"
export INTERNAL_AUTH_SECRET="supersecret-default"
export SECRET_KEY="supersecret-default"
# Run the API
uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
# Configure NextAuth
export NEXTAUTH_URL="http://localhost:3000"
export NEXTAUTH_SECRET="fallback-secret-for-development"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
# Run the client
npm run dev
```

Navigate to `http://localhost:3000` to log in and access the dashboard.

## 🛡️ Production Deployment

RootRecall is built to be deployed across standard enterprise infrastructure:
- **Frontend:** Vercel or Netlify (Zero-config Next.js deployments).
- **Backend:** Railway or Render (Procfile and standard `requirements.txt` included).

See `render.yaml` and `railway.json` for IAC configuration.

## 📄 License
Proprietary. All rights reserved. RootRecall AI.
