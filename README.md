# RetroGemini Team Retrospectives

Self-hosted, collaborative retrospectives for product and engineering teams. The app ships with its own lightweight API and WebSocket sync server—no external SaaS dependencies required.

## Features
- Team workspaces protected by a shared password
- Ready-to-use and custom retrospective templates (Start/Stop/Continue, 4Ls, Mad/Sad/Glad, Sailboat, Went Well, and more)
- Guided phases: Icebreaker, Brainstorm, Group, Vote, Discuss, Review, Close
- Configurable voting rules with anonymous brainstorming support
- Action item backlog with assignment and carry-over between sessions
- Timer controls, presence indicators, and live sync via Socket.IO
- Optional participant invitations via shareable links or email (SMTP configurable)

## Architecture and data
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express + Socket.IO (see `server.js`)
- **Persistence:** Teams, retrospectives, and actions are stored server-side in a lightweight SQLite data store. The server auto-creates the parent folder for the DB file, tries `/data/data.sqlite` (or `DATA_STORE_PATH` if set), and falls back to writable `/tmp` when needed.

## Getting started locally
### Prerequisites
- Node.js 20+
- npm
- Docker (optional, for containerized runs)

### Install dependencies
```bash
npm install
```

### Run with hot reload
Start the API/sync server and the Vite dev server in separate terminals:
```bash
# Terminal 1: API + Socket.IO (port 3000)
npm run start

# Terminal 2: frontend with Vite (port 5173)
npm run dev
```
Vite proxies `/api` and `/socket.io` requests to the backend so data stays in sync.

### Production build
```bash
npm run build
npm run start   # serves the built app and API from Express on port 3000
```

### Persistence configuration (Railway/OpenShift)
- The API uses SQLite for persistence. By default the database file is created in `/data/data.sqlite` (suitable for mounted volumes). If that cannot be opened, it falls back to writable `/tmp/data.sqlite`, then to a local file.
- Override the location with the `DATA_STORE_PATH` environment variable, and mount a persistent volume at that path to survive restarts/redeployments. The server will create the parent directory if needed and log which path is in use.
  - **Railway:** add a Persistent Volume mounted at `/data` and set `DATA_STORE_PATH=/data/data.sqlite` (or rely on the `/data` default).
  - **OpenShift/Kubernetes:** create a PVC and mount it (e.g., to `/data`), then set `DATA_STORE_PATH=/data/data.sqlite` in the deployment manifest.

### Docker Compose
- **Development:** `docker-compose up dev` (Vite on port 5173)
- **Production-like:** `docker-compose up app` (Express server on port 8080)

## Kubernetes/OpenShift
Manifest templates live under `k8s/` with Kustomize overlays:
```bash
# Create a namespace
oc new-project retro-gemini-dev

# Deploy to development
oc apply -k k8s/overlays/dev

# Deploy to production
oc apply -k k8s/overlays/prod
```

## Project structure
```
.
├── App.tsx                 # Main React composition
├── components/             # UI components (dashboard, session, modals)
├── services/               # Data and sync helpers
├── server.js               # Express + Socket.IO backend
├── docker-compose.yml      # Local dev/production profiles
├── k8s/                    # Kubernetes/OpenShift manifests
├── Dockerfile              # Production image
├── Dockerfile.dev          # Hot-reload development image
├── railway.toml            # Railway config (kept for compatibility)
├── vite.config.ts          # Vite configuration and dev proxy
├── tailwind.config.js      # Tailwind setup
└── package.json            # Scripts and dependencies
```

## Security notes
- No third-party data services are used; all data remains on your server
- Health endpoints for monitoring: `/health` and `/ready`
- Nginx and container configs included for non-root runtime deployments

## License
MIT
