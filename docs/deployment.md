# RootRecall Deployment Guide

This guide details the steps to deploy the RootRecall platform.

## Architecture Overview

RootRecall consists of two main components:
1. **Frontend**: Next.js application, styled using Tailwind CSS v4, optimized for deployment on **Vercel**.
2. **Backend**: FastAPI (Python) server, powered by SQLite database, optimized for deployment on **Railway** or **Render**.

---

## 1. Backend Deployment (Railway or Render)

The backend is configured out-of-the-box with a `Procfile` and `requirements.txt`.

### Steps:
1. Push the RootRecall repository to your GitHub.
2. In Railway (or Render), create a new project and connect your repository.
3. Set the root directory to `/backend`.
4. Define the following environment variables:
   - `PORT`: (Automatically set by the platform, defaults to 8000)
5. Deploy. The platform will automatically recognize the `Procfile` and run:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

---

## 2. Frontend Deployment (Vercel)

The frontend is a Next.js application.

### Steps:
1. In Vercel, import your GitHub repository.
2. Set the root directory to `/frontend`.
3. Add the following environment variables (pointing to your deployed backend):
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-url.railway.app`
   - `NEXT_PUBLIC_WS_URL`: `wss://your-backend-url.railway.app/ws/telemetry`
4. Vercel will automatically detect Next.js and run the build command.
5. Deploy.

---

## 3. Local Development

To run both services locally for testing:

### Start Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the platform.
