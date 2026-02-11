# Project Context

Quick reference guide for project documentation and resources.

## Documentation

- **[ADR_BACKEND.md](./ADR_BACKEND.md)** - Backend architectural decisions
- **[backend_roadmap](./backend_roadmap/)** - Backend implementation task roadmaps
- **[PRD.md](./PRD.md)** - Product Requirements Document
- **[CLAUDE.md](../CLAUDE.md)** - Project overview and development guidelines

## External Resources

- **[Effect Documentation](https://effect.website/docs)** - Official Effect TypeScript documentation
- **[Effect SQL](https://effect.website/docs/sql)** - Effect SQL library documentation
- **[Effect Platform](https://effect.website/docs/platform)** - Effect Platform documentation

## Backend Project Structure

```
backend/
├── src/
│   ├── domain/              # Domain models (Abstract Data Types)
│   │   ├── Auth.ts          # Auth request/response schemas (LoginInput, AuthResponse, etc.)
│   │   ├── User.ts          # User entity and schemas (User, UserId, UserRole)
│   │   ├── Customer.ts      # Customer entity and schemas
│   │   ├── Service.ts       # Service entity and schemas
│   │   ├── Order.ts         # Order entity and schemas
│   │   ├── CurrentUser.ts   # Current user context for authenticated requests
│   │   ├── *Errors.ts       # Domain-specific error types
│   │   └── RefreshToken.ts  # Refresh token entity
│   │
│   ├── application/         # Business logic (Use Cases & Services)
│   │   └── auth/
│   │       ├── *UseCase.ts  # Use cases (LoginUseCase, LogoutUseCase, etc.)
│   │       ├── JwtService.ts          # JWT token generation and verification
│   │       ├── PasswordService.ts     # Password hashing and verification
│   │       └── TokenGenerator.ts      # Refresh token generation
│   │
│   ├── repositories/        # Data access layer
│   │   ├── UserRepository.ts
│   │   ├── RefreshTokenRepository.ts
│   │   ├── CustomerRepository.ts
│   │   ├── ServiceRepository.ts
│   │   └── OrderRepository.ts
│   │
│   ├── infrastructure/      # External integrations
│   │   └── database/
│   │       ├── SqlClient.ts        # PostgreSQL client layer
│   │       └── migrations/         # Database migrations
│   │
│   ├── http/                # HTTP layer
│   │   ├── HttpServer.ts           # HTTP server configuration
│   │   ├── Router.ts               # Main router (mounts all route modules)
│   │   ├── RequestParser.ts        # Request body/query parsing utilities
│   │   ├── CookieHelper.ts         # Cookie management utilities
│   │   └── middleware/
│   │       ├── auth.ts             # Authentication middleware
│   │       ├── cors.ts             # CORS middleware
│   │       ├── logger.ts           # Request logging middleware
│   │       └── errorHandler.ts     # Domain error to HTTP error mapping
│   │
│   ├── api/                 # HTTP route handlers
│   │   └── auth/
│   │       └── authRoutes.ts       # Auth endpoints (login, logout, refresh)
│   │
│   ├── configs/             # Configuration
│   │   └── env.ts                  # Environment variable schemas
│   │
│   └── main.ts              # Application entry point (layer composition)
│
├── test/                    # Tests (unit and integration)
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Key Patterns & Conventions

### Effect Service Pattern

All repositories and use cases are Effect Services:

```typescript
export class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    return { /* methods */ }
  })
}) {}
```

### Domain Models (Abstract Data Types)

All data models use `Schema.Class` from Effect:

```typescript
export class LoginInput extends Schema.Class<LoginInput>('LoginInput')({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  password: Schema.String.pipe(Schema.minLength(8)),
}) {}
```

### Path Aliases (TypeScript)

```typescript
"@domain/*": ["src/domain/*"]
"@application/*": ["src/application/*"]
"@infrastructure/*": ["src/infrastructure/*"]
"@repositories/*": ["src/repositories/*"]
"@api/*": ["src/api/*"]
"@http/*": ["src/http/*"]
"@configs/*": ["src/configs/*"]
"@shared/*": ["src/shared/*"]
```

### Layer Composition (main.ts)

Services are composed in layers and provided to HTTP server:

```typescript
// Service layer (repositories, use cases, utilities)
const ServicesLive = Layer.mergeAll(
  UserRepository.Default,
  LoginUseCase.Default,
  // ... other services
)

// HTTP server with middleware
const HttpLive = HttpServer.serve(appWithMiddleware).pipe(
  Layer.provide(HttpServerLive),    // Server config
  Layer.provide(ServicesLive),      // Business logic
  Layer.provide(SqlClientLive)      // Database
)
```

### Route Handler Pattern

Route handlers use `Effect.gen` and call use cases:

```typescript
const loginHandler = Effect.gen(function* () {
  const loginUseCase = yield* LoginUseCase
  const request = yield* HttpServerRequest.HttpServerRequest
  const body = yield* request.json
  const input = yield* Schema.decodeUnknown(LoginInput)(body)
  const result = yield* loginUseCase.execute(input)
  return yield* HttpServerResponse.json(result)
})
```

### Middleware Pattern

Middleware uses `HttpMiddleware.make`:

```typescript
export const authMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    // ... extract and verify token
    return yield* Effect.provide(app, CurrentUser.layer(currentUser))
  })
)
```

### Error Handling

- Domain errors are custom classes: `InvalidCredentialsError`, `UserNotFoundError`, etc.
- Middleware (`errorHandlerMiddleware`) maps domain errors to HTTP responses
- Use cases return `Effect<Result, Error, Requirements>`
- Route handlers don't catch errors (middleware handles all)

## Database

- **Client**: PostgreSQL via `@effect/sql-pg`
- **Migrations**: Located in `src/infrastructure/database/migrations/`
- **Connection**: Configured via environment variables (`DATABASE_HOST`, `DATABASE_PORT`, etc.)
- **Important**: Always use explicit column lists in queries (NEVER `SELECT *`)

## Authentication

### Token Strategy
- **Access Token**: JWT, 15-minute expiry, verified on each request
- **Refresh Token**: Random cryptographic token, 7-day expiry, stored in database (hashed)
- **Token Rotation**: New refresh token issued on each refresh, old token revoked

### Cookie Configuration
- **Access Token Cookie**: HttpOnly, 15min expiry, path=/
- **Refresh Token Cookie**: HttpOnly, 7 days expiry, path=/api/auth/refresh
- **Security**: Secure flag in production, SameSite=Strict

### Endpoints
- `POST /api/auth/login` - Email/password authentication
- `POST /api/auth/refresh` - Token rotation (cookie or body)
- `POST /api/auth/logout` - Session termination (protected)

### Middleware
- `authMiddleware` - Optional auth (provides CurrentUser if token present)
- `requireAuthMiddleware` - Required auth (returns 401 if no valid token)
- `requireAdminMiddleware` - Admin-only routes (returns 403 if not admin)

## Development Workflow

### Running the Server
```bash
bun run dev          # Development mode with hot reload
bun run build        # Build for production
bun run start        # Run production build
```

### Type Checking & Formatting
```bash
bun run typecheck    # TypeScript type checking
bun run format       # Format code with Prettier
bun run format:check # Check formatting
```

### Database Operations
```bash
bun run migrate        # Run pending migrations
bun run migrate:create # Create new migration
```

### Git Workflow
- **Never push to master** - Always create feature branches
- Branch naming: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Target branch for PRs: `setup-backend`
- Commit messages: Use conventional commits (feat:, fix:, docs:, etc.)

## Environment Variables

Required:
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `JWT_SECRET`

Optional (with defaults):
- `PORT` (default: 3000)
- `HOST` (default: 0.0.0.0)
- `NODE_ENV` (default: development)
- `JWT_ACCESS_EXPIRY` (default: 15m)
- `JWT_REFRESH_EXPIRY` (default: 7d)
- `BCRYPT_ROUNDS` (default: 12)

## Completed Phases

- ✅ **Phase 1**: Project setup and database schema
- ✅ **Phase 2**: Repository layer implementation
- ✅ **Phase 3**: Authentication domain logic (use cases)
- ✅ **Phase 4**: Service layer (orders, customers, services)
- ✅ **Phase 5**: HTTP server and middleware infrastructure
- ✅ **Phase 6**: Authentication API routes

## Next Phases

- **Phase 7**: Customer API routes
- **Phase 8**: Service API routes
- **Phase 9**: Order API routes
- **Phase 10**: Analytics API routes
