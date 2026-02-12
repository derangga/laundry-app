# Project Context

Technical reference map for the laundry management application backend.

## External Resources

- **[Effect Documentation](https://effect.website/docs)** - Official Effect TypeScript documentation
- **[Effect SQL](https://effect.website/docs/sql)** - Effect SQL library documentation
- **[Effect Platform](https://effect.website/docs/platform)** - Effect Platform documentation

## Backend Project Structure

```
/backend
├── src/
│   ├── configs/
│   │   └── env.ts              # Environment variable parsing
│   │
│   ├── domain/                  # Business entities, errors, domain services
│   │   ├── Auth.ts              # Auth-related schemas
│   │   ├── Customer.ts          # Customer entity (Model.Class)
│   │   ├── CustomerErrors.ts    # Customer domain errors
│   │   ├── CurrentUser.ts       # Current user context
│   │   ├── LaundryService.ts    # Service entity (Model.Class)
│   │   ├── Order.ts             # Order entity (Model.Class)
│   │   ├── OrderErrors.ts       # Order domain errors
│   │   ├── OrderItem.ts         # OrderItem entity (Model.Class)
│   │   ├── OrderStatusValidator.ts # Status transition validation
│   │   ├── PhoneNumber.ts       # Phone number utilities
│   │   ├── RefreshToken.ts      # Refresh token entity
│   │   ├── ServiceErrors.ts    # Service domain errors
│   │   ├── User.ts              # User entity (Model.Class)
│   │   ├── UserErrors.ts        # User domain errors
│   │   └── http/
│   │       └── HttpErrors.ts    # HTTP error definitions
│   │
│   ├── usecase/                 # Business logic (renamed from application)
│   │   ├── auth/
│   │   │   ├── AuthorizationGuards.ts
│   │   │   ├── BootstrapUseCase.ts
│   │   │   ├── JwtService.ts     # JWT signing/verification
│   │   │   ├── LoginUseCase.ts
│   │   │   ├── LogoutUseCase.ts
│   │   │   ├── PasswordService.ts
│   │   │   ├── RefreshTokenUseCase.ts
│   │   │   ├── RegisterUserUseCase.ts
│   │   │   └── TokenGenerator.ts
│   │   ├── customer/
│   │   │   └── CustomerService.ts
│   │   └── order/
│   │       ├── LaundryServiceService.ts
│   │       └── OrderService.ts
│   │
│   ├── middleware/              # HTTP middleware (moved from http/middleware)
│   │   └── AuthMiddleware.ts    # JWT authentication middleware
│   │
│   ├── http/                    # HTTP server configuration
│   │   ├── CookieHelper.ts
│   │   ├── HttpServer.ts        # Bun HTTP server setup
│   │   ├── RequestParser.ts
│   │   └── Router.ts            # Route composition
│   │
│   ├── repositories/            # Database repositories
│   │   ├── CustomerRepository.ts
│   │   ├── OrderItemRepository.ts
│   │   ├── OrderRepository.ts
│   │   ├── RefreshTokenRepository.ts
│   │   ├── ServiceRepository.ts
│   │   └── UserRepository.ts
│   │
│   ├── handlers/                # API handler implementations
│   │   ├── AuthHandlers.ts
│   │   └── CustomerHandlers.ts
│   │
│   ├── api/                     # HttpApi definitions
│   │   ├── AuthApi.ts
│   │   └── CustomerApi.ts
│   │
│   └── main.ts                  # Application entry point
│
├── test/                        # Test files mirroring src/ structure
│   ├── usecase/                 # (renamed from application)
│   │   ├── auth/
│   │   ├── customer/
│   │   └── order/
│   ├── repositories/
│   ├── api/
│   │   └── auth/
│   └── setup.test.ts
│
├── migrations/                  # Database migrations
├── package.json
├── tsconfig.json
└── vitest.config.ts
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
