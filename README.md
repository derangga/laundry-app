# Laundry Management Application

A modern web application for managing laundry business operations. Streamline customer management, order processing, payments, and business analytics with an intuitive interface.

## Features

- **Customer Management** — Quick customer lookup and registration using phone numbers as unique identifiers
- **Order Processing** — Multi-item orders with automatic price calculation and status tracking (Received → In Progress → Ready → Delivered)
- **Payment Processing** — Support for immediate payment or deferred payment when laundry is ready
- **Analytics Dashboard** — Weekly revenue and order volume trends (admin-only)
- **Receipt Generation** — Professional, printable receipts for every order
- **Services Management** — Create and manage the service catalog with flexible pricing by weight (kg) or set
- **User Management** — Admin can create, update, and deactivate staff accounts
- **Role-Based Access** — Secure access control with Admin and Staff roles

## Tech Stack

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Effect TypeScript](https://effect.website/) (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Database**: PostgreSQL 18 (direct SQL, no ORM, UUID v7 for primary keys)
- **Authentication**: JWT access tokens + refresh tokens in httpOnly cookies

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) (React)
- **Routing**: [TanStack React Router](https://tanstack.com/router)
- **State Management**: [TanStack React Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

## Prerequisites

- **[Bun](https://bun.sh/)** — JavaScript runtime and package manager
- **PostgreSQL** — via one of the following:
  - **[Docker](https://www.docker.com/)** & **Docker Compose** — run PostgreSQL in a container
  - **[Nix](https://nixos.org/)** — fully managed dev environment with PostgreSQL included

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url>
cd laundry-app
bun install
```

### 2. Start PostgreSQL

Choose **one** of the following options:

#### Option A: Docker

```bash
docker compose -f docker-compose.dev.yml up -d
```

Wait for the container to be healthy (~5 seconds).

#### Option B: Nix

```bash
nix develop
```

This drops you into a dev shell with Bun, Node.js, and PostgreSQL. On first run it initializes a local data directory (`.nix-postgres/`) and starts PostgreSQL automatically. The database `laundry_app_dev` is created for you.

> Skip to step 4 if using Nix — database env vars are already exported by the shell hook.

### 3. Create environment files

**`backend/.env`**:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=$USER
DATABASE_PASSWORD=postgres_dev_password
DATABASE_NAME=laundry_app_dev

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

PORT=3000
HOST=127.0.0.1
NODE_ENV=development
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3100
```

**`frontend/.env`**:

```env
API_INTERNAL_URL=http://localhost:3000
```

> **How API routing works in dev:**
> - **Browser (client-side)** requests use relative URLs (`/api/...`). The Vite dev server proxies these to the backend via the `server.proxy` setting in `frontend/vite.config.ts`.
> - **Server-side (SSR)** requests use `API_INTERNAL_URL` directly, since relative URLs can't be resolved without a host.
>
> If you run the backend on a different port (e.g. `4000`), update **both**:
> 1. `API_INTERNAL_URL` in `frontend/.env` → `http://localhost:4000`
> 2. `server.proxy['/api'].target` in `frontend/vite.config.ts` → `http://localhost:4000`

### 4. Run database migrations

```bash
cd backend && bun run migrate:up
```

### 5. Start development servers

```bash
bun run dev
```

The application will be available at:
- **Frontend**: http://localhost:3100
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

## Development Workflow

### Starting the Application

#### Docker

```bash
docker compose -f docker-compose.dev.yml up -d
bun run dev
```

#### Nix

```bash
nix develop          # enter shell — exports all DB and observability env vars
process-compose up   # start PostgreSQL + Prometheus + Loki + OTel Collector + Grafana
bun run dev          # start backend + frontend
```

> **Tip:** Run `process-compose up --detached` to start services in the background, then use `process-compose attach` to open the TUI or `process-compose process list` to check status.

Services started by `process-compose`:

| Service | URL |
|---------|-----|
| PostgreSQL | `localhost:5432` |
| Grafana | http://localhost:3001 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |
| OTLP HTTP | http://localhost:4318 |

### Stopping the Application

#### Docker

```bash
# Stop dev servers
Ctrl+C

# Stop PostgreSQL
docker compose -f docker-compose.dev.yml down
```

#### Nix

```bash
# Stop dev servers
Ctrl+C

# Stop all services (PostgreSQL + observability stack)
process-compose down

# Stop PostgreSQL only
pg_ctl stop -D $PGDATA
```

### Database Management

#### Docker

**View database logs:**

```bash
docker logs -f laundry_dev_postgres
```

**Connect to PostgreSQL shell:**

```bash
docker exec -it laundry_dev_postgres psql -U $USER -d laundry_app_dev
```

**Reset database** (WARNING: destroys all data):

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd backend && bun run migrate:up
```

#### Nix

**Connect to PostgreSQL shell:**

```bash
psql -h $PGHOST -p $PGPORT -d laundry_app_dev
```

**Reset database** (WARNING: destroys all data):

```bash
dropdb -h $PGHOST -p $PGPORT laundry_app_dev
createdb -h $PGHOST -p $PGPORT laundry_app_dev
cd backend && bun run migrate:up
```

### Running Tests

```bash
# Backend tests
cd backend
bun run test

# Type checking (backend + frontend)
bun run typecheck

# Frontend linting
cd frontend
bun run lint
```

## Environment Variables

### Required

| Variable | Description | Default/Example |
|----------|-------------|-----------------|
| `DATABASE_HOST` | PostgreSQL server host | `localhost` |
| `DATABASE_PORT` | PostgreSQL server port | `5432` |
| `DATABASE_USER` | PostgreSQL username | `$USER` (current system user) |
| `DATABASE_PASSWORD` | PostgreSQL password | `postgres_dev_password` |
| `DATABASE_NAME` | Database name | `laundry_app_prod` |
| `JWT_SECRET` | Secret key for JWT signing | *required* |

### Optional (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_EXPIRY` | `15m` | JWT access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | JWT refresh token expiry |
| `PORT` | `3000` | Backend server port |
| `HOST` | `127.0.0.1` | Backend server host |
| `NODE_ENV` | `development` | Environment mode |
| `BCRYPT_ROUNDS` | `12` | Bcrypt hashing rounds |
| `CORS_ORIGIN` | `http://localhost:3100` | Allowed CORS origin for frontend |
| `LOG_LEVEL` | `info` | Log verbosity (debug, info, warn, error) |
| `LOG_FORMAT` | `pretty` | Log format (json or pretty) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_INTERNAL_URL` | `""` (empty) | Backend URL for server-side (SSR) requests. Set to `http://localhost:3000` in local dev. |

Client-side (browser) API requests don't need a base URL — they use relative paths (`/api/...`) which are routed by:
- **Local dev**: Vite dev server proxy (`server.proxy` in `frontend/vite.config.ts`)
- **Production (Docker)**: nginx reverse proxy

## Development Commands

### Root Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend + frontend in parallel |
| `bun run build` | Build both backend and frontend |
| `bun run typecheck` | Type-check both backend and frontend |
| `bun run format` | Format both backend and frontend |
| `bun run lint` | Lint frontend code |

### Backend Commands

```bash
cd backend
bun run dev          # Start development server (with watch mode)
bun run build        # Build for production
bun run start        # Start production server
bun run test         # Run tests
bun run test:run    # Run tests once
bun run migrate:up   # Run database migrations
bun run migrate:down # Rollback database migrations
```

### Frontend Commands

```bash
cd frontend
bun run dev          # Start development server (port 3100)
bun run build        # Build for production
bun run preview      # Preview production build
bun run test         # Run tests
bun run lint         # Lint code
```

## API Documentation

OpenAPI documentation is available in development mode at:

```
http://localhost:3000/docs
```

This endpoint is only available when `NODE_ENV` is not set to `production`.

## Project Structure

```
laundry-app/
├── backend/
│   ├── src/
│   │   ├── api/            # HttpApi route definitions
│   │   ├── configs/        # Environment variable parsing
│   │   ├── domain/         # Entities, DTOs, error types
│   │   ├── handlers/       # Route handler implementations
│   │   ├── http/           # HTTP server setup, router
│   │   ├── infrastructure/ # Infrastructure utilities
│   │   ├── middleware/     # Auth middleware
│   │   ├── repositories/   # Database access
│   │   ├── server/         # Server configuration
│   │   ├── usecase/        # Business logic
│   │   └── main.ts         # Entry point
│   ├── migrations/         # Database migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/           # API clients and data fetching
│   │   ├── components/    # React components
│   │   ├── domain/        # Frontend domain types
│   │   ├── hooks/         # Custom React hooks
│   │   ├── integrations/  # Third-party integrations
│   │   ├── lib/           # Utilities
│   │   └── routes/        # TanStack Router file-based routes
│   └── package.json
│
├── docs/                  # Documentation
├── package.json           # Root package.json
└── README.md
```

