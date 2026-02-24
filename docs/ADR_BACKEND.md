# Backend Architecture Decision Record

**Status**: Proposed
**Date**: 2026-02-09
**Authors**: Development Team
**Version**: 1.0

## Document Information

This ADR documents the architectural decisions for the laundry management application backend. It provides rationale, alternatives considered, and consequences for each key decision to guide implementation and serve as a reference for future development.

## 1. Executive Summary

### Technology Stack Overview

- **Runtime**: Bun (JavaScript runtime with native TypeScript support)
- **Framework**: Effect-TS with @effect/platform-bun (pure Effect, no separate HTTP framework)
- **Database**: PostgreSQL with @effect/sql and @effect/sql-pg
- **Validation**: @effect/schema
- **Authentication**: JWT with refresh tokens
- **API Pattern**: REST
- **Testing**: Vitest

### Key Architectural Choices

1. **Pure Effect Platform Approach**: Using @effect/platform-bun directly without additional web frameworks for maximum control and consistency
2. **REST API**: Standard HTTP semantics over tRPC/RPC for simplicity and frontend flexibility
3. **Native Effect Database Layer**: @effect/sql with `Model.Class` for database entities and `Effect.Service` for repositories
4. **Modern Effect Patterns**: `Effect.Service` for dependency injection and `Model.makeRepository` for CRUD operations
5. **JWT with Refresh Tokens**: Balancing statelessness and security with token rotation
6. **Clean Architecture**: Domain-driven directory structure aligned with Effect patterns
7. **Typed Error Handling**: Effect's error channel for explicit, typed error management
8. **Schema-First Validation**: @effect/schema for end-to-end type safety

### Monorepo Context

The backend is located at `/backend` within a Bun workspace monorepo structure, allowing for shared packages and consistent dependency management across frontend and backend.

---

## 2. Architectural Decisions

### Decision 1: HTTP Server - @effect/platform-bun

#### Context

The application requires an HTTP server to handle REST API requests. We need to choose between using a dedicated web framework (Express, Fastify, Hono) or leveraging Effect's platform-specific HTTP capabilities. The choice impacts code consistency, performance, control over request lifecycle, and alignment with Effect's programming model.

#### Decision

Use `@effect/platform-bun` HTTP server directly without additional web frameworks. Implement routing, middleware, and request handling using pure Effect combinators and patterns.

#### Rationale

- **Native Bun Integration**: @effect/platform-bun leverages Bun's native HTTP server for optimal performance without framework overhead
- **Consistent Effect Model**: Maintains Effect programming model throughout the stack without impedance mismatch between framework abstractions and Effect
- **Direct Control**: Full control over request/response lifecycle, middleware composition, and error handling
- **Built-in Capabilities**: Effect Platform provides HTTP server capabilities designed specifically for Effect applications
- **No Framework Lock-in**: Reduces dependencies and avoids framework-specific patterns that may conflict with Effect idioms
- **Simplified Mental Model**: One programming paradigm (Effect) rather than learning framework-specific conventions

#### Alternatives Considered

**Hono**

- Pros: Fast, modern, good DX, Bun-compatible
- Cons: Adds abstraction layer over Effect, requires adapters, framework patterns may not align with Effect

**Fastify**

- Pros: Mature ecosystem, good performance, extensive plugin system
- Cons: Not designed for Effect patterns, requires significant integration work, callback-based patterns

**Express**

- Pros: Most popular, vast ecosystem, familiar to many developers
- Cons: Legacy design, callback-based, poor TypeScript support, not optimized for modern runtimes

#### Consequences

**Positive**:

- Full type safety from request to response
- Consistent error handling using Effect's error channel
- Optimal performance with Bun runtime
- Complete control over middleware composition
- No framework upgrade/migration concerns

**Negative**:

- Need to implement routing logic (no off-the-shelf router)
- Smaller community compared to popular frameworks
- May require more initial setup for common patterns (CORS, body parsing)
- Team needs strong Effect-TS knowledge

**Risks**:

- Learning curve for developers unfamiliar with Effect Platform HTTP APIs
- Less third-party middleware available
- Need to handle edge cases manually

#### Implementation Notes

**Router Implementation**:

- Use `HttpApiBuilder` with `HttpApi.make()` for declarative endpoint definitions
- Route handlers return `Effect<Response, HttpError, Dependencies>`
- Compose routes using `HttpApiBuilder.group()` for handler implementations
- Layer composition with `Layer.provide()` for dependency injection

**Middleware Composition**:

- Use `HttpApiMiddleware.Tag<AuthMiddleware>` pattern for authentication
- Middleware provides `CurrentUser` context to protected handlers
- Bearer token verification via `HttpApiSecurity.bearer`
- Use `Layer.effect()` to implement middleware with dependencies

**Request Parsing**:

- Parse JSON bodies using @effect/schema for validation
- Extract path/query parameters with type safety
- `HttpApiBuilder` handles automatic validation via `setPayload()` and `addSuccess()`/`addError()`

**Response Building**:

- Construct responses with proper status codes (200, 201, 400, 401, 404, 500)
- Use tagged errors for consistent error responses
- Error mapping via `Effect.mapError()` in handlers

**Security**:

- CORS configuration via `HttpApiBuilder.middlewareCors()`
- AuthMiddleware for JWT verification on protected routes
- Role-based authorization via guards in use cases

---

### Decision 2: API Design Pattern - REST

#### Context

The backend needs an API pattern to expose functionality to the TanStack Start frontend. Options include REST, GraphQL, tRPC, or Effect RPC. The choice impacts frontend integration, type safety, API discoverability, and architectural complexity.

#### Decision

Implement a REST API using standard HTTP semantics with Effect-TS for handlers and business logic.

#### Rationale

- **Standard HTTP Semantics**: Well-understood patterns (GET, POST, PUT, DELETE) with clear resource-based design
- **Framework-Agnostic Frontend**: TanStack Start can consume REST APIs naturally using fetch without special client libraries
- **Appropriate Complexity**: For this application size and scope, REST provides sufficient functionality without the overhead of GraphQL or RPC frameworks
- **Simple Architecture**: Fewer abstractions and moving parts compared to GraphQL resolvers or tRPC routers
- **HTTP Tooling**: Standard HTTP debugging tools, caching mechanisms, and infrastructure work seamlessly
- **Type Safety Preserved**: @effect/schema provides runtime validation and type inference for request/response contracts

#### Alternatives Considered

**tRPC**

- Pros: End-to-end type safety, great DX with TypeScript, shared types between client/server
- Cons: Adds complexity, requires tRPC client on frontend, couples frontend/backend more tightly, less mature ecosystem for Effect integration

**Effect RPC**

- Pros: Native Effect solution, designed for Effect applications
- Cons: Less mature, smaller ecosystem, requires custom frontend client, locks into Effect ecosystem for client

**GraphQL**

- Pros: Flexible queries, reduces over-fetching, strong typing with schema
- Cons: Significant complexity, resolver overhead, overkill for this application, requires GraphQL client setup, challenging error handling

#### Consequences

**Positive**:

- Simple, well-understood API design
- Easy to document (OpenAPI/Swagger if needed)
- Frontend can use standard fetch or any HTTP client
- Good performance for this use case
- Standard HTTP caching strategies available
- Easy to test with standard HTTP tools

**Negative**:

- No automatic end-to-end type safety (requires manual schema alignment)
- Potential for over-fetching or under-fetching data
- Version management requires discipline
- Multiple endpoints for related operations

**Risks**:

- Schema drift between frontend and backend (mitigate with shared types package)
- Breaking changes require API versioning strategy
- Need manual documentation maintenance

#### Implementation Notes

**Endpoint Design**:
export class CustomerApi extends HttpApi.make('CustomerApi').add(
HttpApiGroup.make('Customers').add(
HttpApiEndpoint.get('searchByPhone', '/api/customers')
.addSuccess(Customer)
.addError(CustomerNotFound),
HttpApiEndpoint.post('create', '/api/customers')
.setPayload(CreateCustomerInput)
.addSuccess(Customer)
.addError(CustomerAlreadyExists),
HttpApiEndpoint.get('getById', '/api/customers/:id')
.addSuccess(Customer)
.addError(CustomerNotFound)
)
) {}

**Resource-Based Routing**:

- Nouns for resources (customers, orders, services)
- HTTP verbs for actions (GET=read, POST=create, PUT=update, DELETE=delete)
- Consistent URL structure

**Response Format**:

- JSON for all responses
- Consistent error structure:
  ```json
  {
    "error": {
      "code": "CUSTOMER_NOT_FOUND",
      "message": "Customer with phone +62812345678 not found",
      "details": {}
    }
  }
  ```

**Status Codes**:

- 200 OK (successful GET/PUT)
- 201 Created (successful POST)
- 400 Bad Request (validation errors)
- 401 Unauthorized (authentication required)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (resource not found)
- 500 Internal Server Error (unexpected errors)

**Versioning Strategy**:

- Start without version prefix (v1 implicit)
- If breaking changes needed, introduce `/api/v2/` prefix
- Maintain backward compatibility where possible

---

### Decision 3: Database Layer - @effect/sql with PostgreSQL

#### Context

The application requires database access for persisting customers, orders, services, and users. We need to choose between an ORM (Prisma, Drizzle), query builder (Kysely), or native Effect database library. The choice impacts type safety, query expressiveness, Effect integration, and control over SQL.

#### Decision

Use `@effect/sql` with `@effect/sql-pg` for database access, implementing a repository pattern with Effect Services.

#### Rationale

- **Native Effect Integration**: @effect/sql is designed for Effect applications with proper error handling and Effect types
- **Model.Class for Entities**: `Model.Class` provides database entity definitions with built-in CRUD through `Model.makeRepository`
- **Effect.Service Pattern**: Modern `Effect.Service` pattern for repositories provides cleaner syntax and automatic dependency management
- **Direct SQL Control**: Complex analytics queries require SQL control; ORMs can be limiting
- **Type Safety**: Excellent type safety through @effect/schema for row parsing and query results
- **Connection Pooling**: Built-in connection pool management
- **Consistent Programming Model**: Same Effect patterns throughout application
- **Transaction Management**: Natural transaction handling with Effect's compositional nature
- **Performance**: No ORM overhead, direct SQL execution
- **Migration Support**: Can use @effect/sql migrations or external tools

#### Alternatives Considered

**Drizzle ORM**

- Pros: Excellent DX, strong TypeScript support, Bun-compatible, good query builder
- Cons: Adds abstraction layer, requires Effect wrappers for error handling, may limit complex queries

**Kysely**

- Pros: Great type safety, good query builder, SQL-first approach
- Cons: Not Effect-native, requires significant Effect integration work, separate runtime concerns

**Prisma**

- Pros: Mature ecosystem, great DX, automatic migrations, Prisma Studio
- Cons: Separate runtime/engine, poor Effect integration, schema-first approach may not fit, heavier dependency

**Raw pg Driver**

- Pros: Maximum control, lightweight
- Cons: No Effect integration, manual error handling, no type safety, significant boilerplate

#### Consequences

**Positive**:

- Idiomatic Effect code throughout
- `Model.Class` provides automatic CRUD operations via `Model.makeRepository`
- `Effect.Service` offers cleaner dependency injection compared to manual Context.Tag
- Direct SQL for complex analytics queries
- Full type safety with @effect/schema
- Excellent error handling via Effect error channel
- Connection pooling built-in
- Transaction composability
- No ORM impedance mismatch

**Negative**:

- Write more SQL compared to ORM query builders
- Need to handle migrations separately (not auto-generated)
- Manual schema definitions in TypeScript
- Smaller ecosystem compared to Prisma/Drizzle

**Risks**:

- Learning curve for @effect/sql API
- SQL injection if not careful with dynamic queries
- Schema drift between database and TypeScript types

#### Implementation Notes

**Schema Definition**:

```typescript
import { Schema } from '@effect/schema'
import { Model } from '@effect/sql'

class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(Schema.String),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsert, // snake_case matches database column
  updated_at: Model.DateTimeUpdate, // snake_case matches database column
}) {}
```

**Note**: Use `Model.Class` for database entities as it provides built-in support for:

- Generated IDs with `Model.Generated`
- Automatic timestamps with `Model.DateTimeInsert` and `Model.DateTimeUpdate`
- Integration with `Model.makeRepository` for CRUD operations
- **Important**: Property names should match database column names exactly (use `snake_case` for database fields like `created_at`, `customer_id`, etc.)

**Repository Pattern**:

```typescript
import { SqlClient } from '@effect/sql'

export class CustomerRepository extends Effect.Service<CustomerRepository>()('CustomerRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const repo = yield* Model.makeRepository(Customer, {
      tableName: 'customers',
      spanPrefix: 'CustomerRepository',
      idColumn: 'id',
    })

    // CRITICAL: Always use explicit column lists, NEVER use SELECT *
    const findByPhone = (phone: string) =>
      sql<Customer>`
            SELECT id, name, phone, address, created_at, updated_at
            FROM customers
            WHERE phone = ${phone}
          `.pipe(
        Effect.flatMap((rows) =>
          rows.length > 0 ? Effect.succeed(Option.some(rows[0])) : Effect.succeed(Option.none())
        )
      )

    return {
      ...repo, // Includes findById, insert, update, delete
      fetchByPhone,
    }
  }),
  dependencies: [PgLive],
}) {}
```

**Note**: `Effect.Service` provides:

- Cleaner syntax compared to manual `Context.Tag` definitions
- Automatic dependency management
- Better integration with Effect's layer system
- `Model.makeRepository` generates CRUD operations automatically

**Query Execution**:

- **CRITICAL: NEVER use `SELECT *` in queries - always specify explicit column lists**
  - Improves performance by reducing data transfer
  - Prevents accidentally exposing sensitive columns
  - Makes schema changes more explicit and traceable
  - Provides better type safety and clarity
- Use sql template literal for custom queries with explicit columns
- `Model.makeRepository` provides standard CRUD operations automatically
- Parse results with @effect/schema (automatic with Model.Class)
- Wrap in Effect for error handling
- Use transactions for multi-step operations

**Example - Correct vs Incorrect**:

```typescript
// ❌ WRONG - Never use SELECT *
sql<Customer>`SELECT * FROM customers WHERE id = ${id}`

// ✅ CORRECT - Always list explicit columns
sql<Customer>`
  SELECT id, name, phone, address, created_at, updated_at
  FROM customers
  WHERE id = ${id}
`

// ✅ CORRECT - Use specialized models for subsets
sql<CustomerSummary>`
  SELECT id, name, phone
  FROM customers
  ORDER BY name ASC
`
```

**Important Patterns**:

- Always use `Model.Class` for database entities (not `Schema.Struct`)
- Always use `Effect.Service` for repositories and services (not manual `Context.Tag`)
- Import `Model` from `@effect/sql` for entity definitions
- Repository methods from `Model.makeRepository` include: `findById`, `insert`, `update`, `delete`

**Naming Conventions**:

- **Database tables**: Use `snake_case` (e.g., `customers`, `order_items`, `refresh_tokens`)
- **Database columns**: Use `snake_case` (e.g., `customer_id`, `created_at`, `updated_at`, `phone_number`)
- **Model.Class properties**: Must match database column names exactly (use `snake_case`)
- **TypeScript variables/functions**: Use `camelCase` for application code, but `snake_case` for database mappings

**Migration Strategy**:

- Consider golang-migrate or similar tool for SQL migrations
- Store migration files in `/backend/migrations/`
- Version migrations with timestamps
- Run migrations as part of deployment process

**Connection Configuration**:

- Connection pool size based on expected load
- Timeout configuration
- SSL/TLS for production
- Environment-based configuration

---

### Decision 4: Authentication & Authorization - JWT with Refresh Tokens

#### Context

The application requires authentication for staff/admin users and authorization to enforce role-based permissions. We need to choose between session-based authentication, pure JWT, or JWT with refresh tokens. The system must support token revocation (logout, role changes) while maintaining good performance and user experience.

#### Decision

Implement JWT-based authentication with refresh token pattern, role-based access control (RBAC), and token rotation.

#### Rationale

**Why JWT with Refresh Tokens**:

- **Stateless Access Tokens**: Reduces database lookups for every request, improves scalability
- **Revocation Capability**: Refresh tokens stored in database enable revocation (logout, security events)
- **Security Balance**: Short-lived access tokens (15 min) limit exposure; refresh tokens provide seamless UX
- **Standard Pattern**: Industry-standard approach with well-understood security characteristics
- **Good Fit for Use Case**: Staff application with infrequent logins but need for immediate revocation

**Token Strategy**:

- **Access Tokens**: JWT, short-lived (15 minutes), contain user ID and role, signed with secret
- **Refresh Tokens**: Random tokens, long-lived (7-30 days), stored in database, rotated on use
- **Transport Method**: Both tokens returned in response body (`AuthResponse { accessToken, refreshToken, user }`)
- **Client Storage**: Client manages token storage (recommended: access token in memory, refresh token in localStorage)
- **Authentication**: Access token sent via `Authorization: Bearer <token>` header (verified by `AuthMiddleware`)
- **Refresh**: Refresh token sent in request body `{ refreshToken }` (cookie fallback supported for backward compatibility)
- **Rotation**: Issue new refresh token on each refresh (limits replay window)

**Authorization (RBAC)**:

- **Roles**: Admin (full access) vs Staff (limited access)
- **Role in JWT**: Role claim embedded in access token
- **Permission Checks**: Route-level and operation-level guards
- **Effect Context**: Current user/role available via `CurrentUser` provided by `AuthMiddleware`

#### Alternatives Considered

**Session-Based Authentication**

- Pros: Simple revocation (delete session), familiar pattern, server controls everything
- Cons: Requires Redis or database for session storage, scaling complexity, stateful

**Pure JWT (No Refresh Tokens)**

- Pros: Fully stateless, simple implementation
- Cons: Cannot revoke tokens before expiry, security risk if token compromised, long expiry = high risk, short expiry = poor UX

**OAuth2/OIDC**

- Pros: Industry standard, delegation support
- Cons: Overkill for staff-only internal application, requires auth provider, complex

#### Consequences

**Positive**:

- Good performance (stateless access token validation)
- Immediate revocation via refresh token invalidation
- Scalable (no session state to manage)
- Secure token storage (httpOnly cookies)
- Token rotation limits replay attacks
- Standard approach with good library support

**Negative**:

- Two-token system adds complexity
- Database lookup required for refresh operations
- Must maintain refresh token table
- Token rotation logic required
- Clock skew considerations for JWT expiry

**Risks**:

- JWT secret leak compromises all tokens
- Refresh token database becomes bottleneck under high load
- Cookie security depends on HTTPS in production
- Need to handle token refresh failures gracefully on frontend

#### Implementation Notes

**JWT Structure**:

```typescript
interface AccessTokenPayload {
  sub: string // User ID
  role: 'admin' | 'staff'
  iat: number // Issued at
  exp: number // Expires at (15 min)
}
```

**Refresh Token Storage**:

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
)
```

**Authentication Flow**:

1. Login: Validate credentials → Generate access + refresh tokens → Store refresh token hash in database → Return `AuthResponse { accessToken, refreshToken, user }` in response body
2. API Request: Client sends `Authorization: Bearer <accessToken>` → `AuthMiddleware` verifies JWT signature → Extract user/role → Inject `CurrentUser` into Effect Context
3. Refresh: Client sends `{ refreshToken }` in request body (or cookie fallback) → Validate refresh token → Check not revoked → Generate new tokens → Rotate refresh token → Return new `AuthResponse`
4. Logout: Client sends `Authorization: Bearer <accessToken>` + optional `{ refreshToken }` → Revoke refresh token in database

**Authorization Implementation**:

```typescript
// CurrentUser is provided by AuthMiddleware
const currentUser = yield * CurrentUser

// Authorization guard
const requireAdmin = Effect.gen(function* () {
  const user = yield* CurrentUser
  if (user.role !== 'admin') {
    return yield* Effect.fail(new ForbiddenError())
  }
})
```

**AuthMiddleware using HttpApiMiddleware.Tag pattern**:

```typescript
import { HttpApiMiddleware, HttpApiSecurity } from '@effect/platform'
import { Effect, Layer, Redacted } from 'effect'
import { Unauthorized } from '@domain/http/HttpErrors'
import { JwtService } from 'src/usecase/auth/JwtService'
import { CurrentUser, CurrentUserData } from '@domain/CurrentUser'

export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()('AuthMiddleware', {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer,
  },
}) {}

export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const jwtService = yield* JwtService

    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const tokenValue = Redacted.value(token)
          const payload = yield* jwtService
            .verifyAccessToken(tokenValue)
            .pipe(Effect.mapError((error) => new Unauthorized({ message: error.message })))

          return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          } satisfies CurrentUserData
        }),
    }
  })
)
```

**Usage in API endpoints**:

```typescript
HttpApiEndpoint.post('logout', '/api/auth/logout').middleware(AuthMiddleware) // Requires authentication
```

**Note**: `AuthMiddleware` uses `HttpApiMiddleware.Tag` pattern because it represents request-scoped security that:

- Extracts and verifies bearer tokens from Authorization header
- Provides `CurrentUser` context to downstream handlers
- Is declared at the API/security level for type-safe security

**Middleware**:

- Authentication middleware extracts/verifies access token
- Injects CurrentUser into Effect Context
- Routes requiring auth are composed with auth middleware
- Admin routes additionally use requireAdmin guard

**Security Considerations**:

- JWT secret from environment variable (long, random)
- Password hashing with bcrypt or argon2 (cost factor ≥ 10)
- HTTPS-only cookies in production
- Refresh token hashing before storage
- Rate limiting on login/refresh endpoints
- CSRF protection if needed (SameSite cookies may suffice)

---

### Decision 5: Project Structure - Clean Architecture

#### Context

The backend codebase needs a clear directory structure that organizes code by responsibility, facilitates testing, and aligns with Effect-TS patterns. The structure should support the domain model (customers, orders, services, users) while maintaining separation of concerns.

#### Decision

Organize code using Clean Architecture / Hexagonal Architecture principles within `/backend`, with layers for domain logic, application use cases, infrastructure concerns, and API routes.

#### Rationale

- **Separation of Concerns**: Business logic isolated from infrastructure and HTTP concerns
- **Testability**: Domain and application layers can be tested without HTTP or database
- **Effect Service Pattern**: Natural fit with `Effect.Service` for dependency injection and service composition
- **Maintainability**: Clear boundaries make code easier to navigate and modify
- **Domain-Driven**: Structure mirrors business domains (customer, order, service)
- **Scalability**: Easy to add new features or domains without cross-contamination

#### Project Structure

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

#### Layer Responsibilities

**Domain Layer** (`src/domain/`):

- Business entities (using `Model.Class` for database entities)
- Domain-specific errors (`*Errors.ts`)
- Domain services and utilities (PhoneNumber, OrderStatusValidator)
- HTTP error definitions (`http/HttpErrors.ts`)
- Pure functions (no infrastructure dependencies)

**API Layer** (`src/api/`):

- `HttpApi.make()` definitions with endpoints and groups
- Request/response schemas
- Error definitions per endpoint
- Type-safe API contracts

**Handlers Layer** (`src/handlers/`):

- `HttpApiBuilder.group()` implementations for each API
- Request parsing and parameter extraction
- Error mapping from domain errors to HTTP errors
- Calls use cases and maps results to responses
- HTTP-specific concerns only

**Usecase Layer** (`src/usecase/`):

- Use cases orchestrating domain services
- Application-specific business flows
- Transaction boundaries
- Depends on domain layer and repositories
- Independent of HTTP/database details

**Middleware Layer** (`src/middleware/`):

- `AuthMiddleware` using `HttpApiMiddleware.Tag` pattern
- JWT verification and CurrentUser provision
- Request-scoped security

**Repository Layer** (`src/repositories/`):

- Database access using `Effect.Service` and `Model.makeRepository`
- CRUD operations for entities
- Custom queries with explicit column selection

**HTTP Layer** (`src/http/`):

- HTTP server setup (`HttpServer.ts`)
- Router composition (`Router.ts`)
- Request parsing utilities

**Configuration Layer** (`src/configs/`):

- Environment variable parsing (`env.ts`)
- Application configuration

#### Communication Rules

- **API → Handlers**: HttpApi definitions define contracts
- **Handlers → Usecases**: Handler implementations call use cases
- **Usecases → Domain**: Use cases call domain services
- **Usecases → Repositories**: Use cases depend on repository abstractions
- **Domain → Repository**: Repository interfaces defined in domain, implemented in infrastructure
- **Middleware → Context**: AuthMiddleware provides CurrentUser to downstream handlers

#### Consequences

**Positive**:

- Clear boundaries between layers
- Highly testable (can test domain without infrastructure)
- Easy to navigate codebase
- Supports domain-driven design
- Effect Services naturally fit this structure
- Easy to swap infrastructure implementations

**Negative**:

- More files and directories than flat structure
- May feel over-engineered for small applications
- Requires discipline to maintain boundaries
- Potential for boilerplate in simple CRUD operations

**Risks**:

- Team may be tempted to skip layers for "simple" features
- Circular dependencies if not careful
- Need to resist putting business logic in routes or repositories

#### Handler Pattern Example

**API Definition (src/api/CustomerApi.ts)**:

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Customer, CreateCustomerInput } from '@domain/Customer'

export class CustomerApi extends HttpApi.make('CustomerApi').add(
  HttpApiGroup.make('Customers').add(
    HttpApiEndpoint.get('searchByPhone', '/api/customers')
      .addSuccess(Customer)
      .addError(CustomerNotFound),
    HttpApiEndpoint.post('create', '/api/customers')
      .setPayload(CreateCustomerInput)
      .addSuccess(Customer)
      .addError(CustomerAlreadyExists)
  )
) {}
```

**Handler Implementation (src/handlers/CustomerHandlers.ts)**:

```typescript
import { HttpApiBuilder } from '@effect/platform'
import { Effect, Option } from 'effect'
import { CustomerApi } from '@api/CustomerApi'
import { CustomerService } from 'src/usecase/customer/CustomerService'

export const CustomerHandlersLive = HttpApiBuilder.group(CustomerApi, 'Customers', (handlers) =>
  handlers
    .handle('searchByPhone', () =>
      Effect.gen(function* () {
        const customerService = yield* CustomerService
        // Handler logic
      })
    )
    .handle('create', ({ payload }) =>
      Effect.gen(function* () {
        const customerService = yield* CustomerService
        return yield* customerService.create(payload)
      })
    )
)
```

**Router and Layer Composition (src/http/Router.ts)**:

```typescript
import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'
import { CustomerApi } from '@api/CustomerApi'
import { AuthApi } from '@api/AuthApi'
import { CustomerHandlersLive } from '@handlers/CustomerHandlers'
import { AuthHandlersLive } from '@handlers/AuthHandlers'
import { AuthMiddlewareLive } from '@middleware/AuthMiddleware'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerService } from 'src/usecase/customer/CustomerService'

const CustomerApiLive = HttpApiBuilder.api(CustomerApi).pipe(
  Layer.provide(CustomerHandlersLive),
  Layer.provide(CustomerRepository.Default),
  Layer.provide(CustomerService.Default)
)

const AuthApiLive = HttpApiBuilder.api(AuthApi).pipe(
  Layer.provide(AuthHandlersLive),
  Layer.provide(AuthMiddlewareLive)
  // ... other dependencies
)

const ApiLive = Layer.mergeAll(CustomerApiLive, AuthApiLive)
```

**Note**: Services defined with `Effect.Service` automatically provide a `.Default` layer.

---

### Decision 6: Error Handling Strategy - Effect Typed Errors

#### Context

Robust error handling is critical for reliability, debugging, and user experience. We need a strategy that makes error cases explicit, forces handling, provides good error messages, and integrates seamlessly with Effect's programming model. Traditional try/catch approaches lack type safety and composability.

#### Decision

Use Effect's typed error handling with a structured error hierarchy, discriminated unions for error types, and centralized error-to-HTTP mapping.

#### Rationale

- **Explicit Error Cases**: Effect's error channel makes failure cases visible in function signatures
- **Forced Handling**: Cannot ignore errors; must handle or propagate explicitly
- **Type Safety**: TypeScript ensures all error cases are considered
- **Composability**: Errors compose naturally with Effect.catchAll, Effect.catchTag, Effect.orElse
- **Better Error Messages**: Tagged errors can carry structured context
- **Traceability**: Effect provides stack traces and error propagation
- **Separation**: Business errors separated from unexpected errors

#### Error Type Hierarchy

**Domain Errors** (Business Logic):

```typescript
// Customer domain
class CustomerNotFound extends Data.TaggedError('CustomerNotFound')<{
  phone: string
}> {}

class CustomerAlreadyExists extends Data.TaggedError('CustomerAlreadyExists')<{
  phone: string
}> {}

class CustomerValidationError extends Data.TaggedError('CustomerValidationError')<{
  field: string
  message: string
}> {}

// Order domain
class OrderNotFound extends Data.TaggedError('OrderNotFound')<{
  orderId: string
}> {}

class InvalidOrderStatus extends Data.TaggedError('InvalidOrderStatus')<{
  currentStatus: string
  attemptedStatus: string
}> {}

class OrderValidationError extends Data.TaggedError('OrderValidationError')<{
  errors: Array<{ field: string; message: string }>
}> {}
```

**Infrastructure Errors**:

```typescript
class DatabaseError extends Data.TaggedError('DatabaseError')<{
  operation: string
  cause: unknown
}> {}

class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
  setting: string
  message: string
}> {}
```

**Authentication/Authorization Errors**:

```typescript
class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  reason: string
}> {}

class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
  requiredRole?: string
}> {}

class InvalidTokenError extends Data.TaggedError('InvalidTokenError')<{
  tokenType: 'access' | 'refresh'
}> {}
```

#### Error Recovery Strategies

**Retry** (for transient failures):

```typescript
const result = Effect.retry(
  fetchFromExternalService,
  Schedule.exponential('100 millis').pipe(Schedule.upTo('5 seconds'))
)
```

**Fallback** (default values):

```typescript
const config = loadConfig.pipe(Effect.catchAll(() => Effect.succeed(defaultConfig)))
```

**Transform** (map to different error):

```typescript
const customer = repo
  .findByPhone(phone)
  .pipe(Effect.mapError((dbError) => new CustomerNotFound({ phone })))
```

**Fail Fast** (propagate error):

```typescript
const order = Effect.gen(function* (_) {
  const customer = yield* _(customerService.findByPhone(phone)) // Propagates error
  return yield* _(orderService.create(customer.id, items))
})
```

#### Client-Facing Error Mapping

Map domain/infrastructure errors to HTTP status codes:

```typescript
const errorToHttpResponse = (error: unknown): HttpResponse => {
  if (error instanceof CustomerNotFound) {
    return HttpResponse.json(
      {
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: `Customer with phone ${error.phone} not found`,
        },
      },
      { status: 404 }
    )
  }

  if (error instanceof UnauthorizedError) {
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: error.reason } },
      { status: 401 }
    )
  }

  if (error instanceof ForbiddenError) {
    return HttpResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  if (error instanceof OrderValidationError) {
    return HttpResponse.json(
      { error: { code: 'VALIDATION_ERROR', errors: error.errors } },
      { status: 400 }
    )
  }

  // Unexpected errors
  console.error('Unexpected error:', error)
  return HttpResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  )
}
```

#### Logging Strategy

Use Effect Logger for structured logging:

```typescript
Effect.gen(function* (_) {
  yield* _(Effect.logInfo('Creating order', { customerId, items }))
  const order = yield* _(orderService.create(customerId, items))
  yield* _(Effect.logInfo('Order created', { orderId: order.id }))
  return order
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* (_) {
      yield* _(Effect.logError('Order creation failed', { error }))
      return yield* _(Effect.fail(error))
    })
  )
)
```

**Log Levels**:

- **Debug**: Development details
- **Info**: Important business events (order created, customer registered)
- **Warning**: Recoverable issues (retry attempts, fallback used)
- **Error**: Failures requiring attention (validation errors, auth failures)
- **Fatal**: Unrecoverable errors (configuration missing, database unreachable)

#### Alternatives Considered

**Try/Catch Exceptions**

- Pros: Familiar, built into JavaScript
- Cons: No type safety, easy to forget handling, breaks Effect composition

**Result Type (Custom)**

- Pros: Type-safe error handling
- Cons: Reinventing the wheel, poor integration with Effect

**Throwing Errors in Effect**

- Pros: Simple
- Cons: Loses typed error benefits, Effect.die for unexpected errors only

#### Consequences

**Positive**:

- All error cases explicit in type signatures
- Compiler enforces error handling
- Rich error context for debugging
- Consistent error handling patterns
- Easy error transformation and recovery
- Structured logging integration

**Negative**:

- Requires discipline to create error types
- More verbose than throwing exceptions
- Learning curve for Effect error handling
- Need to maintain error type hierarchy

**Risks**:

- Developers may use Effect.die to bypass error handling (anti-pattern)
- Over-granular error types increase complexity
- Error mapping to HTTP must be kept in sync

#### Implementation Notes

**Error Handling**:

```typescript
// HttpApiBuilder handles errors automatically via addError() declarations
HttpApiEndpoint.post('create', '/api/customers')
  .setPayload(CreateCustomerInput)
  .addSuccess(Customer)
  .addError(CustomerAlreadyExists)
  .addError(ValidationError)

// Error mapping is done in handlers using Effect.mapError()
.handle('create', ({ payload }) =>
  Effect.gen(function* () {
    return yield* customerService.create(payload).pipe(
      Effect.mapError((error) => {
        if (error._tag === 'CustomerAlreadyExists') {
          return new CustomerAlreadyExists({ ... })
        }
        return new ValidationError({ message: error.message })
      })
    )
  })
)
```

**Validation Errors**:

```typescript
const parseRequest =
  <A>(schema: Schema.Schema<A>) =>
  (data: unknown): Effect.Effect<A, ValidationError, never> =>
    Schema.decode(schema)(data).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            errors: parseError.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
          })
      )
    )
```

**Testing Errors**:

```typescript
test('returns 404 when customer not found', async () => {
  const result = await Effect.runPromise(
    customerService.findByPhone('+6299999999').pipe(
      Effect.flip // Flip success/error channels for testing
    )
  )

  expect(result).toBeInstanceOf(CustomerNotFound)
  expect(result.phone).toBe('+6299999999')
})
```

---

### Decision 7: Validation Strategy - @effect/schema

#### Context

The application requires validation at multiple layers: HTTP request parsing, database row parsing, and business logic validation. We need a solution that provides type safety, runtime validation, good error messages, and integrates with Effect's programming model. The choice impacts API contract enforcement, data integrity, and type inference throughout the application.

#### Decision

Use `@effect/schema` for all validation, parsing, and serialization needs across HTTP requests, database queries, and domain logic.

#### Rationale

- **Native Effect Integration**: @effect/schema is designed for Effect applications with proper error handling
- **Unified Schema**: Single source of truth for type definition, validation, parsing, and serialization
- **Type Inference**: TypeScript types automatically inferred from schemas
- **End-to-End Type Safety**: Same schema validates API requests and parses database rows
- **Comprehensive Errors**: Detailed validation error messages with field paths
- **Schema Composition**: Build complex schemas from simpler ones
- **Runtime Safety**: Catch type mismatches at runtime (external data boundaries)
- **Ecosystem Alignment**: Best choice for Effect-TS applications

#### Use Cases

**1. API Request Validation**:

```typescript
const CreateOrderRequest = Schema.Struct({
  customerId: Schema.String.pipe(Schema.uuid()),
  items: Schema.Array(
    Schema.Struct({
      serviceId: Schema.String.pipe(Schema.uuid()),
      quantity: Schema.Number.pipe(Schema.positive()),
    })
  ).pipe(Schema.nonEmpty()),
})

type CreateOrderRequest = Schema.Schema.Type<typeof CreateOrderRequest>

const handler = Effect.gen(function* (_) {
  const body = yield* _(parseRequestBody(CreateOrderRequest))
  // body is typed as CreateOrderRequest
})
```

**2. Database Entity Schemas**:

```typescript
// Use Model.Class for database entities (defined in domain layer)
class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(Schema.String),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsert, // Database column: created_at (snake_case)
  updated_at: Model.DateTimeUpdate, // Database column: updated_at (snake_case)
}) {}

// Model.Class integrates with @effect/sql for automatic CRUD operations
const repo =
  yield *
  Model.makeRepository(Customer, {
    tableName: 'customers', // Table name in snake_case
    spanPrefix: 'CustomerRepository',
    idColumn: 'id',
  })

const customer = yield * repo.findById('customer-id')
```

**Note**:

- Use `Model.Class` for database entities that map to tables
- Use `Schema.Struct` for API DTOs, request/response validation, and non-database schemas
- **Database Convention**: All database table names and column names must use `snake_case` (e.g., `created_at`, `updated_at`, `customer_id`)
- **TypeScript Convention**: Model.Class properties should match the database column names exactly (use `snake_case` for database fields)

**3. Shared Value Objects and Enums**:

```typescript
// Shared schemas for status enums (not database entities)
const OrderStatus = Schema.Literal('received', 'in_progress', 'ready', 'delivered')

const PaymentStatus = Schema.Literal('paid', 'unpaid')

type OrderStatus = Schema.Schema.Type<typeof OrderStatus>
type PaymentStatus = Schema.Schema.Type<typeof PaymentStatus>
```

**Note**: For the actual Order entity, use `Model.Class` (see "Database Entity Schemas" section). Use `Schema.Literal` for enums and value objects.

**4. Phone Number Validation**:

```typescript
const PhoneNumber = Schema.String.pipe(
  Schema.pattern(/^\+62\d{9,13}$/),
  Schema.brand('PhoneNumber')
)

type PhoneNumber = Schema.Schema.Type<typeof PhoneNumber>

const normalizePhoneNumber = (phone: string): Effect.Effect<PhoneNumber, ValidationError> =>
  Schema.decode(PhoneNumber)(phone.startsWith('+') ? phone : `+62${phone}`)
```

**5. Configuration Validation**:

```typescript
const AppConfig = Schema.Struct({
  database: Schema.Struct({
    host: Schema.String,
    port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
    database: Schema.String,
    user: Schema.String,
    password: Schema.String
  }),
  jwt: Schema.Struct({
    secret: Schema.String.pipe(Schema.minLength(32)),
    accessTokenExpiry: Schema.String,
    refreshTokenExpiry: Schema.String
  }),
  server: Schema.Struct({
    port: Schema.Number.pipe(Schema.int(), Schema.positive()),
    corsOrigin: Schema.String
  })
})

const loadConfig = (): Effect.Effect<AppConfig, ConfigurationError> =>
  Schema.decode(AppConfig)(process.env).pipe(
    Effect.mapError(err => new ConfigurationError({ ... }))
  )
```

#### Schema Patterns

**Note**: These patterns apply to both `Schema.Struct` (for DTOs) and `Model.Class` (for database entities).

**Optional Fields**:

```typescript
// Example with Schema.Struct (for DTOs)
const CustomerDTO = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  address: Schema.optional(Schema.String), // May be undefined
  notes: Schema.NullOr(Schema.String), // May be null
})

// Same patterns work in Model.Class for database entities
class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(Schema.String),
  name: Schema.String,
  address: Schema.NullOr(Schema.String), // Nullable field (snake_case: address)
  notes: Schema.NullOr(Schema.String), // Nullable field (snake_case: notes)
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}
```

**Transformations**:

```typescript
const DateFromString = Schema.transform(Schema.String, Schema.Date, {
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
})
```

**Refinements**:

```typescript
const PositiveInteger = Schema.Number.pipe(Schema.int(), Schema.positive())

const NonEmptyString = Schema.String.pipe(Schema.minLength(1))
```

**Branded Types** (prevent mixing):

```typescript
const CustomerId = Schema.String.pipe(Schema.uuid(), Schema.brand('CustomerId'))
const ServiceId = Schema.String.pipe(Schema.uuid(), Schema.brand('ServiceId'))

type CustomerId = Schema.Schema.Type<typeof CustomerId>
type ServiceId = Schema.Schema.Type<typeof ServiceId>

// CustomerId and ServiceId are not assignable to each other
```

#### Error Handling

```typescript
const parseResult = Schema.decode(CreateOrderRequest)(requestBody)

// Effect<CreateOrderRequest, ParseError, never>

parseResult.pipe(
  Effect.catchTag('ParseError', (error) =>
    Effect.fail(
      new ValidationError({
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    )
  )
)
```

#### Alternatives Considered

**Zod**

- Pros: Very popular, great DX, excellent error messages, huge ecosystem
- Cons: Not Effect-native, requires adapters for Effect integration, separate runtime

**Yup**

- Pros: Mature, widely used, good for forms
- Cons: Not Effect-native, less TypeScript-centric, older API design

**io-ts**

- Pros: Similar approach to @effect/schema, functional
- Cons: Less integrated with Effect, @effect/schema is the successor

**ArkType**

- Pros: Fast, good TypeScript inference
- Cons: Newer, smaller ecosystem, not Effect-native

**Custom Validation**

- Pros: Full control
- Cons: Massive effort, error-prone, loses ecosystem benefits

#### Consequences

**Positive**:

- Single source of truth for types and validation
- Automatic TypeScript type inference
- Excellent error messages
- Consistent validation across all layers
- Composable schemas
- Runtime safety at boundaries
- Effect-native error handling

**Negative**:

- Learning curve for @effect/schema API
- Schema definitions can be verbose
- Runtime overhead for validation (necessary for safety)
- Breaking changes in @effect/schema affect entire app

**Risks**:

- Over-validation (validating internal data unnecessarily)
- Performance impact if used inappropriately (e.g., validating every function call)
- Schema complexity grows with domain complexity

#### Implementation Notes

**Schema Organization**:

- Domain entity schemas in `src/domain/{entity}/{Entity}.ts` (use `Model.Class` for database entities)
- Request/response DTOs in `src/api/{resource}/schemas.ts` (use `Schema.Struct`)
- Shared utility schemas in `src/domain/` (use `Schema.Struct`)
- Database entities colocated with repositories (use `Model.Class`)

**Best Practices**:

- Validate at boundaries (HTTP requests, database queries, external APIs)
- Don't validate internal function calls between layers
- Use `Model.Class` for database entities (provides CRUD integration)
- Use `Schema.Struct` for API DTOs and validation-only schemas
- Use branded types for IDs to prevent mixing
- Compose schemas to avoid duplication
- Keep schemas close to where they're used

**Testing**:

- Test schema validation separately
- Verify error messages are helpful
- Test edge cases (empty strings, null, undefined, etc.)

### Decision 8: Shared Schema Package

#### Context

The frontend needs the same type definitions used by the backend for API request/response contracts. Duplicating these as plain TypeScript interfaces in the frontend risks drift — any backend schema change (renamed field, new enum value, changed optionality) requires a synchronized manual update on the frontend.

#### Decision

Extract public Schema types (branded IDs, `Schema.Class` DTOs, `Schema.Literal` enums) to a `@laundry-app/shared` workspace package (`packages/shared/`). The backend re-exports these types from its domain files so existing backend imports remain unchanged.

**What moves to shared:**
- Branded IDs: `UserId`, `CustomerId`, `ServiceId`, `OrderId`, `OrderItemId`
- Enum literals: `UserRole`, `OrderStatus`, `PaymentStatus`, `UnitType`, `AnalyticsPaymentFilter`
- Request DTOs: `LoginInput`, `CreateUserInput`, `CreateCustomerInput`, `CreateOrderInput`, etc.
- Response DTOs: `AuthResponse`, `CustomerResponse`, `OrderWithDetails`, `WeeklyAnalyticsResponse`, etc.
- Common schemas: `DecimalNumber`, `DateTimeUtcString`

**What stays in backend:**
- `Model.Class` entities (`User`, `Customer`, `Order`, `OrderItem`, `LaundryService`) — depend on `@effect/sql`
- `Context.Tag` services (`CurrentUser`) — internal DI concern
- Error classes (`CustomerNotFound`, `OrderNotFound`, etc.) — backend-only error handling
- Internal types (`JwtPayload`, `TokenPair`, `WeeklyRow`, `OrderFilterOptions`, `RefreshToken`)
- Utility services (`OrderStatusValidator`, `OrderNumberGenerator`, `PhoneNumber`)

#### Rationale

- **Single source of truth**: One schema definition drives both backend validation and frontend types
- **No breaking changes**: Backend domain files re-export from shared, so all existing `import { X } from '@domain/...'` paths continue to work
- **Minimal dependency**: Shared package depends only on `effect` — no `@effect/platform` or `@effect/sql`
- **Tree-shakeable**: Frontend bundler (Vite) can tree-shake unused schemas

#### Alternatives Considered

- **Plain TypeScript interfaces on frontend**: Simple to write, but duplicates definitions and introduces drift risk. No runtime validation option
- **Full Effect on frontend**: Would allow direct Schema.decode usage, but too heavy — the frontend uses plain fetch + TanStack Query
- **Codegen from OpenAPI**: Backend doesn't generate OpenAPI specs; adding generation requires tooling and build step maintenance

#### Consequences

**Positive**:
- Type-safe API contracts between frontend and backend
- Frontend gets branded IDs, literal unions, and exact optionality from schemas
- Runtime validation available if frontend chooses to use `Schema.decode`
- Backend imports unchanged (re-export pattern)

**Negative**:
- New workspace dependency to manage
- Shared package must be kept dependency-light (only `effect`)
- Changes to shared types affect both frontend and backend (intended, but requires awareness)

#### Implementation Notes

See `docs/shared/phase_01.md` for the full implementation roadmap including file inventory, type classification table, and re-export patterns.

---

## 3. Technology Stack Summary

### Core Dependencies

**Runtime & Language**:

- `bun` - JavaScript runtime (≥1.0)
- `typescript` - Type system (≥5.0)

**Effect Ecosystem**:

- `effect` - Core Effect library (including `Effect.Service` for dependency injection)
- `@effect/platform` - Platform abstractions
- `@effect/platform-bun` - Bun-specific implementations
- `@effect/schema` - Validation and serialization
- `@effect/sql` - SQL database layer (including `Model` utilities for database entities)
- `@effect/sql-pg` - PostgreSQL driver

**Database**:

- `postgresql` - Database server
- `pg` - Node.js PostgreSQL client (peer dependency for @effect/sql-pg)

**Authentication**:

- `jose` - JWT signing and verification
- `bcrypt` or `@node-rs/bcrypt` - Password hashing

**Development**:

- `vitest` - Testing framework
- `@effect/vitest` - Effect testing utilities
- `prettier` - Code formatting
- `eslint` - Linting

### Optional Dependencies

**Migration Tools**:

- `golang-migrate` or `node-pg-migrate` - Database migrations

**Observability** (Future):

- `@effect/opentelemetry` - OpenTelemetry integration
- `pino` - Structured logging

---

## 4. Project Structure Overview

```
/packages/shared/                # @laundry-app/shared — public Effect Schema types
├── src/
│   ├── common/
│   │   ├── decimal-number.ts   # DecimalNumber transform
│   │   └── datetime.ts         # DateTimeUtcString
│   ├── user.ts                 # UserId, UserRole, CreateUserInput, ...
│   ├── auth.ts                 # LoginInput, AuthResponse, ...
│   ├── customer.ts             # CustomerId, CustomerResponse, ...
│   ├── service.ts              # ServiceId, UnitType, ...
│   ├── order.ts                # OrderStatus, PaymentStatus, OrderWithDetails, ...
│   ├── analytics.ts            # WeeklyAnalyticsResponse, DashboardStatsResponse, ...
│   ├── receipt.ts              # ReceiptItem, ReceiptResponse
│   └── index.ts                # Barrel export
├── package.json
└── tsconfig.json

/backend/
├── src/
│   ├── configs/           # Configuration
│   ├── domain/           # Internal types (Model.Class) + re-exports from @laundry-app/shared
│   ├── usecase/          # Business logic
│   ├── middleware/       # AuthMiddleware
│   ├── http/             # HTTP server and router
│   ├── repositories/     # Database repositories
│   ├── handlers/        # API handler implementations
│   ├── api/             # HttpApi definitions
│   └── main.ts          # Application entry point
├── test/                 # Tests mirroring src/ structure
│   ├── usecase/         # (renamed from application)
│   ├── repositories/
│   ├── api/
│   └── setup.test.ts
├── migrations/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Layer Communication

```
HTTP Request
     ↓
[API Layer] - HttpApi definitions (src/api/)
     ↓
[Handlers Layer] - Handler implementations (src/handlers/)
     ↓
[Usecase Layer] - Business logic (src/usecase/)
     ↓
[Domain Layer] - Business entities and rules (src/domain/)
     ↓
[Repository Layer] - Database access (src/repositories/)
```

### Dependency Flow

- API depends on Handlers
- Handlers depend on Usecases
- Usecases depend on Domain and Repositories
- Domain depends on nothing (pure business logic)
- Repositories implement domain interfaces
- AuthMiddleware provides CurrentUser context
- Dependencies injected via Effect Layers

---

## 5. Development Guidelines

### Service Composition Pattern

```typescript
// 1. Define and implement service with Effect.Service
export class CustomerService extends Effect.Service<CustomerService>()('CustomerService', {
  effect: Effect.gen(function* () {
    const repo = yield* CustomerRepository

    return {
      findByPhone: (phone: PhoneNumber) => repo.findByPhone(phone),
      create: (data: NewCustomer) =>
        Effect.gen(function* () {
          // Business logic here
          const existing = yield* repo.findByPhone(data.phone)
          if (Option.isSome(existing)) {
            return yield* Effect.fail(new CustomerAlreadyExists({ phone: data.phone }))
          }
          return yield* repo.insert(data)
        }),
    }
  }),
  dependencies: [CustomerRepository.Default],
}) {}

// 2. Compose layers
const AppLive = Layer.mergeAll(SqlClientLive, CustomerRepository.Default, CustomerService.Default)

// 3. Use in application
const program = Effect.gen(function* () {
  const customerService = yield* CustomerService
  const customer = yield* customerService.findByPhone(phone)
  // ...
}).pipe(Effect.provide(AppLive))
```

**Note**: Prefer `Effect.Service` over manual `Context.Tag` implementations:

- Cleaner, more concise syntax
- Dependencies are explicit in the service definition
- Automatic `.Default` layer generation
- Better type inference
- Consistent pattern across the codebase

### Testing Strategy

**Unit Tests** (Domain & Application):

- Test business logic without infrastructure
- Mock repositories/external services using Test Layers
- Fast, no database required

**Integration Tests** (Infrastructure):

- Test repositories against real database (test container)
- Test HTTP routes end-to-end
- Slower, but catch integration issues

**Test Structure**:

```typescript
import { describe, test, expect } from 'vitest'
import { Effect, Layer } from 'effect'

describe('CustomerService', () => {
  test("creates customer when phone doesn't exist", async () => {
    // Create mock repository layer
    const TestRepo = Layer.succeed(
      CustomerRepository,
      CustomerRepository.of({
        findByPhone: () => Effect.succeed(Option.none()),
        insert: (data) => Effect.succeed({ id: '123', ...data }),
        findById: () => Effect.succeed(Option.none()),
        update: () => Effect.succeed(undefined),
        delete: () => Effect.succeed(undefined),
      })
    )

    const program = Effect.gen(function* () {
      const service = yield* CustomerService
      return yield* service.create({ name: 'John', phone: '+628123456789' })
    }).pipe(Effect.provide(TestRepo), Effect.provide(CustomerService.Default))

    const result = await Effect.runPromise(program)
    expect(result.id).toBe('123')
  })
})
```

**Note**: When testing services defined with `Effect.Service`:

- Use `Layer.succeed` with the service constructor
- Provide all methods required by the repository/service interface
- Use the `.Default` layer for services under test

### Database Migration Approach

**Option 1: golang-migrate**

- Pros: Battle-tested, simple, language-agnostic
- Cons: Separate tool to install

**Option 2: Custom Effect-based migrations**

- Pros: All TypeScript, Effect integration
- Cons: Need to build migration runner

**Recommended**: Start with golang-migrate for simplicity

```bash
# Create migration
migrate create -ext sql -dir migrations -seq create_customers_table

# Run migrations
migrate -path ./migrations -database "postgres://user:pass@localhost/db" up
```

---

## 6. Future Considerations

Topics deferred or out of scope for initial implementation:

### API Evolution

- **GraphQL Migration Path**: If frontend needs more flexible querying, could add GraphQL layer on top of existing use cases
- **tRPC Integration**: If end-to-end type safety becomes critical, could expose tRPC alongside REST
- **API Versioning**: Implement `/api/v2/` if breaking changes needed

### Scalability & Performance

- **Caching Layer**: Redis for frequently accessed data (services, user sessions)
- **Read Replicas**: Separate read/write database connections for scaling
- **Connection Pooling Tuning**: Optimize pool size based on load testing
- **Query Optimization**: Add database indices based on query patterns

### Multi-tenancy

- **Row-Level Security**: PostgreSQL RLS for data isolation
- **Schema Per Tenant**: Separate schemas for larger tenants
- **Tenant Context**: Inject tenant ID into Effect Context

### Async Processing

- **Message Queue**: BullMQ or Effect-based queue for background jobs
- **Email Notifications**: SendGrid/Resend for receipts and notifications
- **Scheduled Tasks**: Cron jobs for analytics aggregation, cleanup

### Observability & Monitoring

- **OpenTelemetry**: Distributed tracing with @effect/opentelemetry
- **Metrics**: Prometheus metrics for monitoring
- **Structured Logging**: Enhanced logging with correlation IDs
- **Error Tracking**: Sentry or similar for error aggregation

### Security Enhancements

- **Rate Limiting**: Per-IP, per-user rate limits
- **CSRF Protection**: If using cookie-based auth without SameSite
- **Audit Logging**: Track all data changes for compliance
- **Input Sanitization**: XSS prevention for text fields

### Developer Experience

- **API Documentation**: OpenAPI/Swagger generation from schemas
- **Development Tools**: Admin panel, database GUI
- **Seed Data**: Rich test data for development
- **E2E Testing**: Playwright or similar for full-stack tests

---

## 7. References

### Official Documentation

- **Effect-TS**: https://effect.website/docs/introduction
- **@effect/platform**: https://effect.website/docs/platform/introduction
- **@effect/schema**: https://effect.website/docs/schema/introduction
- **@effect/sql**: https://effect.website/docs/sql/introduction
- **Bun Runtime**: https://bun.sh/docs

### Best Practices & Guides

- **Effect Style Guide**: https://effect.website/docs/style-guide
- **Clean Architecture**: Robert C. Martin's "Clean Architecture" book
- **PostgreSQL Best Practices**: https://wiki.postgresql.org/wiki/Don't_Do_This
- **JWT Best Practices**: https://datatracker.ietf.org/doc/html/rfc8725

### Community Resources

- **Effect Discord**: https://discord.gg/effect-ts
- **Effect Examples**: https://github.com/Effect-TS/effect/tree/main/packages/examples
- **Effect Twitter**: @EffectTS\_

### Security Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **JWT.io**: https://jwt.io/ (JWT debugger)
- **OWASP Authentication Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

## Appendix: Glossary

- **ADR**: Architecture Decision Record - document capturing architectural decisions
- **Effect**: A composable, type-safe programming model for building resilient applications
- **Effect.Service**: Modern dependency injection pattern providing cleaner syntax than manual Context.Tag
- **Context.Tag**: Manual service definition pattern (prefer Effect.Service when possible)
- **Layer**: Effect's dependency injection container
- **Model.Class**: @effect/sql utility for defining database entity schemas with built-in CRUD support
- **Repository Pattern**: Data access abstraction separating business logic from data access
- **Clean Architecture**: Architectural pattern emphasizing separation of concerns and dependency inversion
- **JWT**: JSON Web Token - compact token format for securely transmitting claims
- **RBAC**: Role-Based Access Control - authorization model based on user roles
- **Schema**: Type-safe data structure definition with validation

---

**Document End**

This ADR should be reviewed and updated as the implementation progresses and new insights are gained. All decisions are open to revision based on real-world experience and changing requirements.
