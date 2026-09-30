# Real-Time Emergency System 3.0

An AI-powered, real-time emergency dispatch and response platform featuring a centralized backend API, ML-based severity triage service, an Electron command center desktop application, and a React Native / Expo mobile app.

---

## 🚀 Architecture Overview

```
                      ┌───────────────────────────────┐
                      │    Mobile App (Expo / RN)     │
                      │  (Field Responders & Citizens)│
                      └──────────────┬────────────────┘
                                     │ REST / WebSocket
                                     ▼
┌─────────────────────────┐   ┌───────────────────────────────┐   ┌─────────────────────────┐
│     AI Microservice     │◄──┤      Backend API Server       │──►│     MongoDB Database    │
│  (FastAPI + ML Models)  │   │     (Node.js / Express)       │   │  (Incidents, Users, etc)│
└─────────────────────────┘   └──────────────▲────────────────┘   └─────────────────────────┘
                                             │ REST / WebSocket
                                             ▼
                              ┌───────────────────────────────┐
                              │  Desktop Command Center App   │
                              │     (Electron + Vite + React) │
                              └───────────────────────────────┘
```

### System Modules

1. **`backend/`**: Node.js & Express API with Socket.IO for real-time bi-directional telemetry, JWT authentication, incident tracking, role-based access control (Admin, Dispatcher, Responder, Citizen), and notification services.
2. **`ai-service/`**: Python FastAPI microservice that utilizes machine learning models (`severity_model.pkl`) to evaluate incoming incident descriptions, categorize priority, and predict triage levels in real time.
3. **`desktop/`**: Electron + Vite + React + TypeScript desktop dashboard designed for dispatchers and emergency command center operators to monitor live maps, active units, and incident feeds.
4. **`mobile/`**: React Native / Expo mobile client application for field responders and users to broadcast SOS signals, report emergencies with media, and receive navigation and alerts.
5. **`docker-compose.yml`**: Docker orchestration for spinning up MongoDB, Backend, and the AI Service simultaneously.

---

## 🛠️ Prerequisites

- **Node.js** (v18 or later)
- **Python** (v3.10 or later)
- **Docker & Docker Compose** (optional, recommended for quick start)
- **Expo CLI** (for mobile development)

---

## ⚡ Quick Start

### Option 1: One-Click Launch (Windows)

Double-click `start.bat` or run:
```cmd
start.bat
```
This builds and starts MongoDB, the Backend API, and the AI Service via Docker Compose, installs desktop dependencies, and launches the Electron Command Center.

### Option 2: Docker Compose

Start the backend, AI service, and MongoDB database:
```bash
docker-compose up --build -d
```

Service endpoints:
- **Backend API**: `http://localhost:5000`
- **AI Service**: `http://localhost:8000`
- **MongoDB**: `mongodb://localhost:27017/emergencyai`

---

## 💻 Manual Setup & Development

### 1. Backend Service (`/backend`)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. AI Microservice (`/ai-service`)
```bash
cd ai-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Desktop Application (`/desktop`)
```bash
cd desktop
npm install
npm run dev
```
To package for production:
```bash
npm run build
```

### 4. Mobile Application (`/mobile`)
```bash
cd mobile
npm install
npx expo start
```

---

## 🔒 Environment Variables

Refer to `backend/.env.example` for backend configuration defaults:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend listening port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/emergencyai` |
| `JWT_SECRET` | Secret key for JWT signing | `emergencyai_super_secret_jwt_key_...` |
| `AI_SERVICE_URL` | AI Microservice base URL | `http://localhost:8000` |
| `FRONTEND_URL` | CORS authorized frontend URL | `http://localhost:5173` |

---

## 📄 License

This project is licensed under the MIT License.
