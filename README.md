# Laundry Management Application

A modern web application for managing laundry business operations. Streamline customer management, order processing, payments, and business analytics with an intuitive interface.

## Features

- **Customer Management** — Quick customer lookup and registration using phone numbers as unique identifiers
- **Order Processing** — Multi-item orders with automatic price calculation and status tracking (Received → In Progress → Ready → Delivered)
- **Payment Processing** — Support for immediate payment or deferred payment when laundry is ready
- **Analytics Dashboard** — Weekly revenue and order volume trends (admin-only)
- **Receipt Generation** — Professional, printable receipts for every order
- **Role-Based Access** — Secure access control with Admin and Staff roles

## Tech Stack

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Effect TypeScript](https://effect.website/) (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Database**: PostgreSQL (direct SQL, no ORM)
- **Authentication**: JWT access tokens + refresh tokens in httpOnly cookies

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) (React)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

## Prerequisites

- [Bun](https://bun.sh/) — JavaScript runtime
- [PostgreSQL](https://www.postgresql.org/) — Database server
- [golang-migrate](https://github.com/golang-migrate/migrate) — Required for database migrations

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd laundry-app
```

2. **Install dependencies**

```bash
bun install
```

3. **Create PostgreSQL database**

```bash
createdb laundry_app
```

4. **Create environment file**

Create a `.env` file in the `backend` directory:

```env
# Database (required)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=laundry_app

# JWT (required - use a strong secret)
JWT_SECRET=your-super-secret-key
```

5. **Run migrations**

```bash
cd backend
bun run migrate:up
```

6. **Start development server**

```bash
bun run dev
```

The application will be available at:
- Frontend: http://localhost:3100
- Backend API: http://localhost:3000

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_HOST` | PostgreSQL server host |
| `DATABASE_PORT` | PostgreSQL server port |
| `DATABASE_USER` | PostgreSQL username |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_NAME` | Database name |
| `JWT_SECRET` | Secret key for JWT signing |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_EXPIRY` | `15m` | JWT access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | JWT refresh token expiry |
| `PORT` | `3000` | Backend server port |
| `HOST` | `0.0.0.0` | Backend server host |
| `NODE_ENV` | `development` | Environment mode |
| `BCRYPT_ROUNDS` | `12` | Bcrypt hashing rounds |

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
│   │   ├── api/           # HttpApi route definitions
│   │   ├── configs/       # Environment variable parsing
│   │   ├── domain/        # Entities, DTOs, error types
│   │   ├── handlers/      # Route handler implementations
│   │   ├── http/          # HTTP server setup, router
│   │   ├── middleware/    # Auth middleware
│   │   ├── repositories/  # Database access
│   │   ├── usecase/      # Business logic
│   │   └── main.ts       # Entry point
│   ├── migrations/       # Database migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── data/         # Data fetching, API clients
│   │   ├── lib/          # Utilities
│   │   └── routes/       # TanStack Router file-based routes
│   └── package.json
│
├── docs/                 # Documentation
├── package.json          # Root package.json
└── README.md
```

