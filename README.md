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
- **[Docker](https://www.docker.com/)** & **Docker Compose** — For running PostgreSQL in a container

## Quick Start

1. **Clone the repository**

```bash
git clone <repository-url>
cd laundry-app
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up database password**

Create the secrets directory and password file:

```bash
mkdir -p secrets
echo "postgres_dev_password" > secrets/db_password.txt
```

4. **Start PostgreSQL**

```bash
docker-compose up -d postgres
```

Wait for the container to be healthy (~10 seconds).

5. **Run database migrations**

```bash
cd backend && bun run migrate:up
```

6. **Create environment file**

Create `backend/.env`:

```env
# Database Configuration (matches Docker setup)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=laundry_app_prod
DATABASE_PASSWORD=postgres_dev_password
DATABASE_NAME=laundry_app_prod

# JWT Configuration (use a strong secret in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Optional Configuration
PORT=3000
HOST=127.0.0.1
NODE_ENV=development
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3100
```

7. **Create frontend environment file**

Create `frontend/.env`:

```env
# API URL for server-side (SSR) requests
API_INTERNAL_URL=http://localhost:3000
```

> **How API routing works in dev:**
> - **Browser (client-side)** requests use relative URLs (`/api/...`). The Vite dev server proxies these to the backend via the `server.proxy` setting in `frontend/vite.config.ts`.
> - **Server-side (SSR)** requests use `API_INTERNAL_URL` directly, since relative URLs can't be resolved without a host.
>
> If you run the backend on a different port (e.g. `4000`), update **both**:
> 1. `API_INTERNAL_URL` in `frontend/.env` → `http://localhost:4000`
> 2. `server.proxy['/api'].target` in `frontend/vite.config.ts` → `http://localhost:4000`

8. **Start development servers**

```bash
bun run dev
```

The application will be available at:
- **Frontend**: http://localhost:3100
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

## Development Workflow

### Starting the Application

```bash
# Start PostgreSQL (if not already running)
docker-compose up -d postgres

# Start backend and frontend dev servers
bun run dev
```

### Stopping the Application

```bash
# Stop dev servers (Ctrl+C in the terminal where bun run dev is running)

# Stop PostgreSQL
docker-compose down
```

### Database Management

**View database logs:**

```bash
docker logs -f laundry_postgres
```

**Connect to PostgreSQL shell:**

```bash
docker exec -it laundry_postgres psql -U laundry_app_prod -d laundry_app_prod
```

**Reset database** (WARNING: destroys all data):

```bash
# Stop and remove everything
docker-compose down -v

# Restart PostgreSQL
docker-compose up -d postgres

# Re-run migrations
cd backend && bun run migrate:up
```

**Check PostgreSQL version:**

```bash
docker exec laundry_postgres psql -U laundry_app_prod -d laundry_app_prod -c "SELECT version();"
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
| `DATABASE_USER` | PostgreSQL username | `laundry_app_prod` |
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

