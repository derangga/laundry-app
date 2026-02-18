# Project Context

Technical reference map for the laundry management application backend. Updated to reflect actual codebase as of Phase 9 completion.

## External Resources

- **[Effect Documentation](https://effect.website/docs)** - Official Effect TypeScript documentation
- **[Effect SQL](https://effect.website/docs/sql)** - Effect SQL library documentation
- **[Effect Platform](https://effect.website/docs/platform)** - Effect Platform documentation

## Backend Project Structure

```
/backend
├── src/
│   ├── configs/
│   │   └── env.ts                    # Environment variable parsing
│   │
│   ├── domain/                        # Business entities, DTOs, errors, domain utilities
│   │   ├── Auth.ts                    # Auth-related schemas (LoginInput, AuthResponse, LogoutInput, etc.)
│   │   ├── AuthError.ts               # Auth domain errors (Data.TaggedError)
│   │   ├── Customer.ts               # Customer entity (Model.Class), DTOs (Schema.Class)
│   │   ├── CustomerErrors.ts          # Customer domain errors
│   │   ├── CurrentUser.ts            # CurrentUser context tag + helpers
│   │   ├── LaundryService.ts          # LaundryService entity, DTOs, UnitType
│   │   ├── Order.ts                   # Order/OrderItem entities, DTOs, filter schemas
│   │   ├── OrderErrors.ts             # Order domain errors
│   │   ├── OrderNumberGenerator.ts    # Order number generation logic
│   │   ├── OrderStatusValidator.ts    # Status transition validation
│   │   ├── PhoneNumber.ts             # Phone number normalization
│   │   ├── RefreshToken.ts            # Refresh token entity
│   │   ├── ServiceErrors.ts           # Service domain errors
│   │   ├── User.ts                    # User entity, UserBasicInfo, UserWithoutPassword
│   │   ├── UserErrors.ts              # User domain errors
│   │   ├── common/
│   │   │   ├── DecimalNumber.ts       # Schema transform: PG DECIMAL string → number
│   │   │   └── DateTimeUtcString.ts   # Schema.DateTimeUtc with JSON Schema annotation
│   │   └── http/
│   │       └── HttpErrors.ts          # HTTP error classes (Schema.TaggedError with status codes)
│   │
│   ├── api/                            # HttpApi endpoint definitions
│   │   ├── AppApi.ts                   # Root API: composes all groups
│   │   ├── AuthApi.ts                  # AuthGroup
│   │   ├── CustomerApi.ts              # CustomerGroup
│   │   ├── OrderApi.ts                 # OrderGroup
│   │   └── ServiceApi.ts              # ServiceGroup
│   │
│   ├── handlers/                       # HttpApiBuilder.group handler implementations
│   │   ├── AuthHandlers.ts
│   │   ├── CustomerHandlers.ts
│   │   ├── OrderHandlers.ts
│   │   └── ServiceHandlers.ts
│   │
│   ├── usecase/                        # Business logic services
│   │   ├── auth/
│   │   │   ├── AuthorizationGuards.ts
│   │   │   ├── BootstrapUseCase.ts
│   │   │   ├── JwtService.ts
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
│   ├── middleware/
│   │   └── AuthMiddleware.ts           # AuthMiddleware + AuthAdminMiddleware
│   │
│   ├── repositories/
│   │   ├── CustomerRepository.ts
│   │   ├── OrderItemRepository.ts
│   │   ├── OrderRepository.ts
│   │   ├── RefreshTokenRepository.ts
│   │   ├── ServiceRepository.ts
│   │   └── UserRepository.ts
│   │
│   ├── http/
│   │   ├── CookieHelper.ts
│   │   ├── HttpServer.ts              # Bun HTTP server setup
│   │   ├── RequestParser.ts
│   │   └── Router.ts                  # Layer composition (handlers → middleware → services → repos → infra)
│   │
│   ├── SqlClient.ts                    # PostgreSQL client setup
│   └── main.ts                        # Entry point
│
├── test/                               # Tests mirroring src/ structure
├── migrations/                         # SQL migrations
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Path Aliases (tsconfig.json)

```typescript
"@domain/*":       "src/domain/*"
"@usecase/*":      "src/usecase/*"
"@repositories/*": "src/repositories/*"
"@api/*":          "src/api/*"
"@http/*":         "src/http/*"
"@configs/*":      "src/configs/*"
"@shared/*":       "src/shared/*"
"@middleware/*":   "src/middleware/*"
"@handlers/*":     "src/handlers/*"
```

**Import convention**: Path aliases are used for cross-layer imports. Some files use `src/` prefix instead (e.g., `import { OrderService } from 'src/usecase/order/OrderService'`). Both work.

## Key Patterns

### 1. Domain Models — `Model.Class` vs `Schema.Class`

**Database entities** use `Model.Class` from `@effect/sql`:
```typescript
import { Schema } from 'effect'
import { Model } from '@effect/sql'

export const OrderId = Schema.String.pipe(Schema.brand('OrderId'))
export type OrderId = typeof OrderId.Type

export class Order extends Model.Class<Order>('Order')({
  id: Model.Generated(OrderId),
  order_number: Schema.String,
  customer_id: CustomerId,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: DecimalNumber,
  created_by: UserId,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}
```

**DTOs (request/response)** use `Schema.Class` from `effect`:
```typescript
export class OrderResponse extends Schema.Class<OrderResponse>('OrderResponse')({
  id: Schema.String,
  order_number: Schema.String,
  status: OrderStatus,
  total_price: Schema.Number,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

export class CreateOrderInput extends Schema.Class<CreateOrderInput>('CreateOrderInput')({
  customer_id: CustomerId,
  items: Schema.Array(CreateOrderItemInput),
  payment_status: Schema.optionalWith(PaymentStatus, { default: () => 'unpaid' as const }),
}) {}
```

**Enums/Literals**:
```typescript
export const OrderStatus = Schema.Literal('received', 'in_progress', 'ready', 'delivered')
export type OrderStatus = typeof OrderStatus.Type
```

**Branded IDs**:
```typescript
export const CustomerId = Schema.String.pipe(Schema.brand('CustomerId'))
export type CustomerId = typeof CustomerId.Type
```

**Common schemas** in `domain/common/`:
- `DecimalNumber` — transforms PG DECIMAL (string) → JS number
- `DateTimeUtcString` — `Schema.DateTimeUtc` with `{ type: "string", format: "date-time" }` JSON Schema annotation for OpenAPI

### 2. HTTP Errors — `Schema.TaggedError` with status annotations

All HTTP errors live in `src/domain/http/HttpErrors.ts`:
```typescript
import { HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  'Unauthorized',
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  'Forbidden',
  { message: Schema.String, requiredRole: Schema.optional(Schema.String) },
  HttpApiSchema.annotations({ status: 403 })
) {}

export class OrderNotFound extends Schema.TaggedError<OrderNotFound>()(
  'OrderNotFound',
  { message: Schema.String, orderId: Schema.optional(Schema.String) },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()(
  'ValidationError',
  { message: Schema.String, field: Schema.optional(Schema.String), details: Schema.optional(Schema.Any) },
  HttpApiSchema.annotations({ status: 400 })
) {}
```

### 3. API Definitions — `HttpApiGroup` + `HttpApiEndpoint`

Each API group is defined in `src/api/` and composed into `AppApi`:

```typescript
// src/api/OrderApi.ts
import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ id: Schema.String })

export const OrderGroup = HttpApiGroup.make('Orders')
  .add(
    HttpApiEndpoint.post('create', '/api/orders')
      .setPayload(CreateOrderInput)
      .addSuccess(OrderResponse)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.get('getById', '/api/orders/:id')
      .setPath(OrderIdParam)
      .addSuccess(OrderWithItemsResponse)
      .addError(OrderNotFound)
  )
  .middlewareEndpoints(AuthMiddleware)  // All endpoints require auth
```

**Admin-only endpoints** use `AuthAdminMiddleware`:
```typescript
// src/api/ServiceApi.ts — admin endpoints first, then public endpoints after middleware
export const ServiceGroup = HttpApiGroup.make('Services')
  .add(HttpApiEndpoint.post('create', '/api/services')...)     // admin
  .add(HttpApiEndpoint.put('update', '/api/services/:id')...)  // admin
  .add(HttpApiEndpoint.del('delete', '/api/services/:id')...)  // admin
  .middlewareEndpoints(AuthAdminMiddleware)                     // applies to above
  .add(HttpApiEndpoint.get('list', '/api/services')...)        // public (no middleware)
```

**Composing into AppApi**:
```typescript
// src/api/AppApi.ts
export class AppApi extends HttpApi.make('AppApi')
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
  .annotateContext(OpenApi.annotations({ title: 'Laundry App API', version: '1.0.0' })) {}
```

### 4. Handlers — `HttpApiBuilder.group`

Handlers implement the API groups defined above:

```typescript
// src/handlers/OrderHandlers.ts
import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { AppApi } from '@api/AppApi'

export const OrderHandlersLive = HttpApiBuilder.group(AppApi, 'Orders', (handlers) =>
  handlers
    .handle('create', ({ payload }) =>
      Effect.gen(function* () {
        const orderService = yield* OrderService
        const currentUser = yield* CurrentUser
        const order = yield* orderService.create({ ...payload, created_by: currentUser.id })
          .pipe(Effect.mapError((error) => {
            if (error._tag === 'EmptyOrderError') return new EmptyOrderError({ message: error.message })
            return new ValidationError({ message: error.message })
          }))
        return OrderResponse.make({ ...order })
      })
    )
    .handle('list', () =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const url = new URL(request.url, 'http://localhost')
        const statusParam = url.searchParams.get('status')
        // Validate enum params with Schema.decodeUnknownOption
        if (statusParam) {
          const decoded = Schema.decodeUnknownOption(OrderStatus)(statusParam)
          if (decoded._tag === 'Some') { /* use decoded.value */ }
          else { return yield* Effect.fail(new ValidationError({ message: '...' })) }
        }
        // ...
      })
    )
)
```

**Key patterns in handlers**:
- `{ payload }` — auto-parsed body from `setPayload()`
- `{ path }` — auto-parsed path params from `setPath()`
- `yield* HttpServerRequest.HttpServerRequest` — access raw request for query params
- `new URL(request.url, 'http://localhost')` — parse query params
- `Schema.decodeUnknownOption(SomeEnum)(value)` — validate enum values
- `Effect.mapError()` — map domain errors to HTTP errors
- `yield* CurrentUser` — get authenticated user from middleware context
- `SomeResponse.make({ ... })` — construct typed response

### 5. Repositories — `Effect.Service` + `SqlClient`

```typescript
import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'

export class OrderRepository extends Effect.Service<OrderRepository>()('OrderRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Optional: base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(Order, {
      tableName: 'orders',
      spanPrefix: 'OrderRepository',
      idColumn: 'id',
    })

    // Custom queries — ALWAYS explicit column lists, NEVER SELECT *
    const findByCustomerId = (customerId: CustomerId) =>
      sql`
        SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
        FROM orders
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
      `.pipe(
        Effect.flatMap((rows) => decodeOrders(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    // Dynamic queries use sql.unsafe()
    const findWithDetails = (filters: OrderFilterOptions) => {
      const conditions: string[] = []
      const params: Array<string | number | Date> = []
      let paramIndex = 1
      // ... build conditions dynamically
      return sql.unsafe(query, params).pipe(...)
    }

    return {
      findById: repo.findById,   // from makeRepository
      insert: repo.insert,       // from makeRepository
      findByCustomerId,           // custom
      findWithDetails,            // custom
    } as const
  }),
}) {}
```

**Key repository patterns**:
- `Schema.decodeUnknown(Schema.Array(SomeModel))` for decoding query results
- `Option.fromNullable(rows[0])` for single-row queries
- `sql.unsafe(query, params)` for dynamic queries with `$1`, `$2` parameter indexing
- Always `RETURNING <columns>` on INSERT/UPDATE
- `as const` on returned object

**Existing methods useful for reuse**:
- `OrderItemRepository.findByOrderIdWithService(orderId)` — joins `order_items` with `services`, returns `OrderItemWithService[]` (has `service_name`, `unit_type`, `price_at_order`, `subtotal`)
- `UserRepository.findBasicInfo(userId)` — returns `{ id, name, email }` (lightweight)
- `CustomerRepository.findById(customerId)` — returns full customer with `name`, `phone`, `address`

### 6. Services/Use Cases — `Effect.Service`

```typescript
export class OrderService extends Effect.Service<OrderService>()('OrderService', {
  effect: Effect.gen(function* () {
    const orderRepo = yield* OrderRepository
    const orderItemRepo = yield* OrderItemRepository

    const create = (data: CreateOrderInput) =>
      Effect.gen(function* () {
        // Parallel operations: Effect.forEach with concurrency
        const items = yield* Effect.forEach(data.items, (item) =>
          Effect.gen(function* () { /* fetch service, compute price */ }),
          { concurrency: 'unbounded' }
        )
        // Insert order
        const order = yield* orderRepo.insert(Order.insert.make({ ... }))
        // Insert items
        yield* orderItemRepo.insertMany(items)
        return order
      })

    return { create, findById, updateStatus }
  }),
  dependencies: [OrderRepository.Default, OrderItemRepository.Default],
}) {}
```

**Key service patterns**:
- `dependencies: [...]` declares layer dependencies (auto-wired with `.Default`)
- `Effect.all([...], { concurrency: N })` for parallel independent queries
- `Option.isNone()` / `Option.isSome()` for null checking
- Domain errors: `yield* Effect.fail(new SomeDomainError({ ... }))`

### 7. Middleware — `HttpApiMiddleware.Tag`

Two middleware classes in `src/middleware/AuthMiddleware.ts`:

**`AuthMiddleware`** — any authenticated user (staff or admin):
```typescript
export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()('AuthMiddleware', {
  failure: Unauthorized,
  provides: CurrentUser,
  security: { bearer: HttpApiSecurity.bearer },
}) {}
```

**`AuthAdminMiddleware`** — admin only (returns 403 for staff):
```typescript
export class AuthAdminMiddleware extends HttpApiMiddleware.Tag<AuthAdminMiddleware>()(
  'AuthAdminMiddleware',
  {
    failure: Schema.Union(Unauthorized, Forbidden),
    provides: CurrentUser,
    security: { bearer: HttpApiSecurity.bearer },
  }
) {}
```

**Implementation** uses `Layer.effect()`:
- Extracts bearer token via `Redacted.value(token)`
- Verifies JWT via `JwtService.verifyAccessToken()`
- Returns `{ id, email, role } satisfies CurrentUserData`
- Admin middleware additionally checks `payload.role !== 'admin'` → `yield* new Forbidden({ ... })`

### 8. CurrentUser Context Tag

```typescript
// src/domain/CurrentUser.ts
export interface CurrentUserData {
  readonly id: UserId
  readonly email: string
  readonly role: UserRole
}

export class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, CurrentUserData>() {
  static readonly get = Effect.serviceOption(CurrentUser).pipe(...)
  static readonly isAdmin = Effect.gen(function* () { ... })
  static readonly layer = (user: CurrentUserData): Layer.Layer<CurrentUser> => Layer.succeed(CurrentUser, user)
}
```

Usage in handlers: `const currentUser = yield* CurrentUser`

### 9. Layer Composition — `Router.ts`

All layers composed in `src/http/Router.ts`:

```typescript
const HandlersLive = Layer.mergeAll(AuthHandlersLive, CustomerHandlersLive, ServiceHandlersLive, OrderHandlersLive)
const MiddlewareLive = Layer.mergeAll(AuthMiddlewareLive, AuthAdminMiddlewareLive)
const UseCasesLive = Layer.mergeAll(LoginUseCase.Default, OrderService.Default, CustomerService.Default, ...)
const RepositoriesLive = Layer.mergeAll(UserRepository.Default, CustomerRepository.Default, OrderRepository.Default, ...)
const InfraLive = Layer.mergeAll(JwtService.Default, TokenGenerator.Default, PasswordService.Default)

const ApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(MiddlewareLive),
  Layer.provide(UseCasesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(InfraLive)
)

export const createAppRouter = () => ApiLive
```

**Adding new features**: add handlers to `HandlersLive`, services to `UseCasesLive`, repositories to `RepositoriesLive`.

## Database

- **Client**: PostgreSQL via `@effect/sql-pg`, setup in `src/SqlClient.ts`
- **Migrations**: `backend/migrations/` (SQL files, run via `bun run migrate:up`)
- **Configuration**: Environment variables parsed in `src/configs/env.ts`
- **Column naming**: Always `snake_case` — model properties match DB columns exactly
- **DECIMAL columns**: Returned as strings by PG, decoded via `DecimalNumber` schema

## Authentication

- **Access Token**: JWT, 15-minute expiry, contains `{ sub: UserId, email, role }`
- **Refresh Token**: Hashed in database, 7-day expiry, token rotation on refresh
- **Middleware**: `AuthMiddleware` (any auth), `AuthAdminMiddleware` (admin only + 403 for staff)
- **Endpoints**: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/register`, `POST /api/auth/bootstrap`
- **Cookie**: httpOnly cookies for token storage

## Existing API Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/auth/login` | None | AuthHandlers |
| POST | `/api/auth/register` | AuthAdmin | AuthHandlers |
| POST | `/api/auth/refresh` | None | AuthHandlers |
| POST | `/api/auth/logout` | Auth | AuthHandlers |
| POST | `/api/auth/bootstrap` | None | AuthHandlers |
| GET | `/api/auth/me` | Auth | AuthHandlers |
| GET | `/api/customers/search` | Auth | CustomerHandlers |
| POST | `/api/customers` | Auth | CustomerHandlers |
| GET | `/api/customers/:id` | Auth | CustomerHandlers |
| PUT | `/api/customers/:id` | Auth | CustomerHandlers |
| POST | `/api/services` | AuthAdmin | ServiceHandlers |
| PUT | `/api/services/:id` | AuthAdmin | ServiceHandlers |
| DELETE | `/api/services/:id` | AuthAdmin | ServiceHandlers |
| GET | `/api/services` | None | ServiceHandlers |
| POST | `/api/orders` | Auth | OrderHandlers |
| GET | `/api/orders` | Auth | OrderHandlers |
| GET | `/api/orders/:id` | Auth | OrderHandlers |
| PUT | `/api/orders/:id/status` | Auth | OrderHandlers |
| PUT | `/api/orders/:id/payment` | Auth | OrderHandlers |
