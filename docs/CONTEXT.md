# Project Context

Technical reference map for the laundry management application backend.

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

## Key Patterns

### Effect Service Pattern
Services use `Effect.Service` with dependency injection. Repositories and use cases extend this pattern.

### Domain Models
All data models use `Schema.Class` from Effect for validation and serialization.

### Layer Composition
Services are composed in `main.ts` using `Layer.mergeAll` and provided to HTTP server via `Layer.provide`.

### Route Handlers
Route handlers use `Effect.gen`, call use cases, and return HTTP responses. No error handling needed (middleware handles it).

### Middleware
Middleware uses `HttpMiddleware.make` to wrap the application and inject context (e.g., CurrentUser).

### Error Handling
- Domain errors are custom classes (e.g., `InvalidCredentialsError`, `UserNotFoundError`)
- `errorHandlerMiddleware` maps domain errors to HTTP responses
- Use cases return `Effect<Result, Error, Requirements>`
- Route handlers don't catch errors

## Path Aliases

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

## Database

- **Client**: PostgreSQL via `@effect/sql-pg`
- **Migrations**: `src/infrastructure/database/migrations/`
- **Configuration**: Environment variables in `src/configs/env.ts`

## Authentication

- **Access Token**: JWT, 15-minute expiry
- **Refresh Token**: Hashed in database, 7-day expiry, token rotation on refresh
- **Middleware**: `authMiddleware`, `requireAuthMiddleware`, `requireAdminMiddleware`
- **Endpoints**: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
