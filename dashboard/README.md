# KikkoUI — DevOps Dashboard

Production-grade web dashboard for managing Ansible-based RKE2/Rancher deployments. Select components, validate compatibility, execute playbooks, and monitor runs — all from a dark-themed browser UI.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (port 3000)                  │
│   React 18 · React Router · Tailwind CSS · Vite          │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────────┐  │
│  │  Login   │ │  Deploy  │ │ History │ │  Inventory  │  │
│  └──────────┘ └──────────┘ └─────────┘ └─────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │  REST / JSON
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend (port 8000)              │
│                                                          │
│  /api/auth          JWT login & RBAC (admin / viewer)    │
│  /api/compatibility  Matrix loading & validation         │
│  /api/inventory      INI/YAML inventory parsing          │
│  /api/ansible        Run, status, logs, cancel           │
│  /api/history        Past execution listing              │
│  /api/health         Liveness probe                      │
│                                                          │
│  Services:                                               │
│    AnsibleRunnerService → subprocess ansible-playbook    │
│    CompatibilityService → JSON matrix engine             │
│    InventoryService     → INI / YAML parser              │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Ansible Project │
              │  (mounted vol)   │
              └─────────────────┘
```

## Project Structure

```
dashboard/
├── docker-compose.yml
├── .dockerignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  # FastAPI entrypoint
│       ├── core/
│       │   ├── config.py            # Settings & paths
│       │   └── security.py          # JWT, password hashing, built-in users
│       ├── api/
│       │   ├── auth.py              # POST /login, GET /me
│       │   ├── deps.py              # get_current_user, require_admin
│       │   ├── compatibility.py     # GET /matrix, POST /validate
│       │   ├── inventory.py         # GET /files, /groups, /variables
│       │   ├── ansible.py           # POST /run, GET /status, /logs, /cancel
│       │   └── history.py           # GET /runs
│       ├── models/
│       │   └── schemas.py           # Pydantic models
│       ├── services/
│       │   ├── ansible_runner_service.py
│       │   ├── compatibility.py
│       │   └── inventory_service.py
│       └── data/
│           └── compatibility_matrix.json
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── hooks/useAuth.jsx        # Auth context + localStorage
        ├── utils/api.js             # Axios client with JWT injection
        ├── components/
        │   ├── Layout.jsx           # Top nav bar
        │   ├── Card.jsx             # Reusable card wrapper
        │   ├── Badge.jsx            # Status badges
        │   ├── Select.jsx           # Styled dropdown
        │   └── LogViewer.jsx        # Auto-scrolling log display
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx        # Stats, inventory summary, recent runs
            ├── Deploy.jsx           # Component selection, validation, execution
            ├── History.jsx          # Past runs with log viewing
            └── Inventory.jsx        # File browser, host groups, variables
```

## Quick Start

### Docker (recommended)

```bash
cd dashboard
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

### Local Development

**Backend:**

```bash
cd dashboard/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd dashboard/frontend
npm install
npm run dev          # → http://localhost:3000
```

## Default Credentials

| User    | Password | Role   | Permissions           |
|---------|----------|--------|-----------------------|
| admin   | admin    | admin  | Full access           |
| viewer  | viewer   | viewer | Read-only (no deploy) |

> Change these immediately in production by updating `core/security.py`.

## API Endpoints

| Method | Path                          | Auth     | Description                    |
|--------|-------------------------------|----------|--------------------------------|
| POST   | `/api/auth/login`             | —        | Obtain JWT token               |
| GET    | `/api/auth/me`                | Bearer   | Current user info              |
| GET    | `/api/compatibility/matrix`   | Bearer   | Full compatibility matrix      |
| POST   | `/api/compatibility/validate` | Bearer   | Validate component selection   |
| GET    | `/api/inventory/files`        | Bearer   | List inventory files           |
| GET    | `/api/inventory/groups`       | Bearer   | Parse hosts & groups           |
| GET    | `/api/inventory/variables`    | Bearer   | Group vars for a file          |
| POST   | `/api/ansible/run`            | Admin    | Launch playbook execution      |
| GET    | `/api/ansible/status/{id}`    | Bearer   | Run status & stats             |
| GET    | `/api/ansible/logs/{id}`      | Bearer   | Execution log output           |
| POST   | `/api/ansible/cancel/{id}`    | Admin    | Cancel running execution       |
| GET    | `/api/history/runs`           | Bearer   | List past executions           |
| GET    | `/api/health`                 | —        | Liveness check                 |

## Execution Modes

| Mode         | Flag               | Description                          |
|--------------|--------------------|--------------------------------------|
| `run`        | —                  | Normal execution                     |
| `check`      | `--check`          | Dry run, no changes applied          |
| `diff`       | `--diff`           | Show file diffs during execution     |
| `check_diff` | `--check --diff`   | Dry run with diffs                   |

## Compatibility Matrix

The dashboard includes a built-in compatibility engine (`data/compatibility_matrix.json`) that validates combinations of:

- **Rancher** versions (2.7.x, 2.8.x, 2.9.x, 2.10.x)
- **RKE2** versions (1.27 – 1.31)
- **CNI plugins** (Calico, Canal, Cilium)
- **Ingress controllers** (nginx-ingress, Traefik)

Invalid combinations are blocked before execution, with clear error and warning messages shown to the user.

## Tech Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Frontend | React 18, React Router 6, Tailwind CSS, Vite  |
| Backend  | FastAPI, Pydantic v2, python-jose, ansible-runner |
| Auth     | JWT (HS256), RBAC (admin / viewer)            |
| Runtime  | Docker, docker-compose, nginx                 |
