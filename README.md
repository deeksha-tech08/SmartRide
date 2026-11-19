# SmartRide - Real-Time Ride Sharing & AI-Assisted Fare Estimation Platform

A full-stack real-time ride-sharing prototype built with React, FastAPI, MongoDB, Socket.IO, and Google Gemini AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Socket.IO Client, React-Leaflet |
| Backend | Python, FastAPI, Uvicorn, python-socketio, Motor (async MongoDB) |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt |
| Maps | Leaflet.js + OpenStreetMap (free, no API key) |
| AI | Google Gemini API (fare explanation only) |

## Features

- **Role-Based Authentication**: Separate dashboards for Passengers and Drivers with strict JWT RBAC.
- **Live Location & Maps**: Leaflet.js map with nearby drivers located via the Haversine formula. Real-time driver location tracking via Socket.IO + browser `watchPosition`.
- **AI Fare Calculation**: Backend deterministic fare math explained in natural language by Google Gemini.
- **Strict Ride Lifecycle**: Real-time Socket.IO syncing for a strict state machine (`requested` -> `accepted` -> `arriving` -> `arrived` -> `started` -> `completed`).
- **Race Condition Handling**: Atomic MongoDB `$set` updates to prevent multiple drivers from accepting the same ride.
- **Ride History**: Isolated historical ride logs for both Passengers and Drivers.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MongoDB URL, JWT secret, and Gemini API key
uvicorn app.main:socket_app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Automated End-to-End Testing (Module 10)

The project includes an automated Python test suite that validates the complete architecture end-to-end. It isolates test accounts, validates RBAC boundary rejections, ensures race-conditions are blocked, walks through strict status transitions, and verifies history isolation.

Make sure your backend server is running, then execute:
```bash
cd backend
python tests/test_e2e.py
```
You should see a sequence of green checkmarks confirming `ALL TESTS PASSED SUCCESSFULLY!`.

## Deployment

The repository includes production-ready configuration files.

### 1. Frontend (Vercel)
The project includes a `vercel.json` at the root configured for Single Page Application (SPA) routing.
- Import the repository into Vercel.
- Framework Preset: **Vite**
- Root Directory: `frontend`
- Add the required environment variable `VITE_API_URL` pointing to your deployed backend.

### 2. Backend (Render)
The project includes a `render.yaml` Blueprint and a `Procfile` configured for ASGI servers to support Socket.IO.
- Connect your GitHub repository to Render.
- Render will automatically detect the ASGI setup via `uvicorn app.main:socket_app --host 0.0.0.0 --port $PORT`.
- Provide the environment variables found in `backend/.env.example` in the Render dashboard.

## Project Structure

```
SmartRide/
 backend/          # FastAPI + Socket.IO server
    app/
       routers/  # REST API endpoints
       services/ # Business logic
       socket/   # Socket.IO event handlers
       schemas/  # Request/response validation
    tests/        # Automated E2E testing suite
    requirements.txt
 frontend/         # React SPA
    src/
        pages/    # Route-level components
        components/ # Reusable UI
        context/  # Auth state provider
 README.md
 vercel.json       # SPA routing config for Vercel
```

## License

This project is built for educational purposes as a Final Year Engineering Project.
