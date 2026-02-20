# OpenAPI & Scalar UI Integration

**Date**: 2026-02-17

## Overview

The backend auto-generates an OpenAPI 3.1 spec from Effect `HttpApi` schemas and serves interactive API docs via [Scalar](https://scalar.com) at `/docs`.

- **OpenAPI spec**: Derived at runtime from `HttpApiGroup` endpoint definitions — request/response schemas, error types, and path parameters are all inferred from Effect schemas.
- **Scalar UI**: Mounted as an `HttpApiScalar` layer, zero config beyond a path.

No hand-written spec files. The spec stays in sync with the code by definition.

## Architecture

```
API Files (HttpApiGroup)         AppApi (HttpApi)              Router / main.ts
┌──────────────────────┐        ┌─────────────────────┐       ┌──────────────────────┐
│ AuthGroup            │──┐     │ AppApi              │       │ HttpApiBuilder.api() │
│ CustomerGroup        │──┼────▶│   .add(AuthGroup)   │──────▶│ Layer.provide(...)   │
│ ServiceGroup         │──┤     │   .add(Customer…)   │       │                      │
│ OrderGroup           │──┘     │   .add(Service…)    │       │ HttpApiScalar.layer  │
└──────────────────────┘        │   .add(Order…)      │       │   { path: '/docs' }  │
                                │   .annotateContext( │       └──────────────────────┘
                                │     OpenApi.annot…) │
                                └─────────────────────┘
```

Each API file exports an `HttpApiGroup` (not an `HttpApi`). Groups are composed into a single `AppApi` class which carries the OpenAPI metadata. The router builds a unified `HttpApiBuilder.api(AppApi)` layer, and `HttpApiScalar` reads the spec from that layer.

## Key Files

| File                                             | Role                                                         |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `backend/src/api/AppApi.ts`                      | Unified `HttpApi` composing all groups + OpenAPI annotations |
| `backend/src/api/AuthApi.ts`                     | `AuthGroup` — auth endpoints                                 |
| `backend/src/api/CustomerApi.ts`                 | `CustomerGroup` — customer CRUD                              |
| `backend/src/api/ServiceApi.ts`                  | `ServiceGroup` — laundry service CRUD                        |
| `backend/src/api/OrderApi.ts`                    | `OrderGroup` — order management                              |
| `backend/src/http/Router.ts`                     | `HttpApiBuilder.api(AppApi)` + layer composition             |
| `backend/src/main.ts`                            | `HttpApiScalar.layer({ path: '/docs' })` mount               |
| `backend/src/domain/common/DateTimeUtcString.ts` | OpenAPI-safe date-time schema                                |

## Patterns

### Defining an HttpApiGroup

API files export an `HttpApiGroup`, **not** an `HttpApi` class. Each endpoint declares its payload, success, and error schemas:

```ts
// backend/src/api/CustomerApi.ts
import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { CustomerResponse, CreateCustomerInput } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

export const CustomerGroup = HttpApiGroup.make('Customers')
  .add(
    HttpApiEndpoint.get('searchByPhone', '/api/customers')
      .addSuccess(CustomerResponse)
      .addError(CustomerNotFound)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.post('create', '/api/customers')
      .setPayload(CreateCustomerInput)
      .addSuccess(CustomerResponse)
      .addError(CustomerAlreadyExists)
      .addError(ValidationError)
  )
```

### Composing groups into AppApi

A single `AppApi` class composes all groups and attaches OpenAPI metadata:

```ts
// backend/src/api/AppApi.ts
import { HttpApi, OpenApi } from '@effect/platform'
import { AuthGroup } from './AuthApi'
import { CustomerGroup } from './CustomerApi'
import { ServiceGroup } from './ServiceApi'
import { OrderGroup } from './OrderApi'

export class AppApi extends HttpApi.make('AppApi')
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
  .annotateContext(
    OpenApi.annotations({
      title: 'Laundry App API',
      version: '1.0.0',
      description: 'API for laundry management — customers, orders, services, payments',
    })
  ) {}
```

### Referencing AppApi in handlers

Handlers use `HttpApiBuilder.group(AppApi, '<GroupName>', ...)` to bind implementations to the group:

```ts
// backend/src/handlers/CustomerHandlers.ts
import { HttpApiBuilder } from '@effect/platform'
import { AppApi } from '@api/AppApi'

export const CustomerHandlersLive = HttpApiBuilder.group(AppApi, 'Customers', (handlers) =>
  handlers
    .handle('searchByPhone', () => /* ... */)
    .handle('create', ({ payload }) => /* ... */)
)
```

The group name string (`'Customers'`) must match the name passed to `HttpApiGroup.make('Customers')`.

### Layer composition in Router

The router groups layers by concern to stay under TypeScript's `Layer.provide` 20-argument limit:

```ts
// backend/src/http/Router.ts
const HandlersLive = Layer.mergeAll(
  AuthHandlersLive,
  CustomerHandlersLive,
  ServiceHandlersLive,
  OrderHandlersLive
)
const MiddlewareLive = Layer.mergeAll(AuthMiddlewareLive, AuthAdminMiddlewareLive)
const UseCasesLive = Layer.mergeAll(/* ... 8 use cases ... */)
const RepositoriesLive = Layer.mergeAll(/* ... 6 repos ... */)
const InfraLive = Layer.mergeAll(
  JwtService.Default,
  TokenGenerator.Default,
  PasswordService.Default
)

const ApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(MiddlewareLive),
  Layer.provide(UseCasesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(InfraLive)
)
```

### Adding Scalar UI

In `main.ts`, add the Scalar layer to the HTTP server composition:

```ts
// backend/src/main.ts
import { HttpApiBuilder, HttpApiScalar, HttpMiddleware, HttpServer } from '@effect/platform'

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiScalar.layer({ path: '/docs' })),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(ApiLayer),
  HttpServer.withLogAddress,
  Layer.provide(HttpServerLive),
  Layer.provide(SqlClientLive)
)
```

The Scalar UI is then available at `http://localhost:<port>/docs`.

## DateFromSelf / JSON Schema Pitfall

### The Problem

`Model.Class` fields like `Model.DateTimeInsertFromDate` and `Model.DateTimeUpdateFromDate` use `Schema.DateFromSelf` internally. This schema has **no `jsonSchema` annotation**, so the OpenAPI spec generator crashes at runtime:

```
Missing annotation
(DateFromSelf <-> Date)
```

This happens when a `Model.Class` entity (e.g., `Customer`, `LaundryService`, `Order`) is used directly as an `addSuccess()` response type.

### The Fix

1. **Create a `DateTimeUtcString` helper** with an explicit JSON Schema annotation:

```ts
// backend/src/domain/common/DateTimeUtcString.ts
import { Schema } from 'effect'

export const DateTimeUtcString = Schema.DateTimeUtc.annotations({
  jsonSchema: { type: 'string', format: 'date-time' },
})
```

2. **Define separate response DTOs** that use `DateTimeUtcString` instead of `Model.DateTimeInsertFromDate` / `Model.DateTimeUpdateFromDate`:

```ts
// Model.Class entity (DB) — uses Model.DateTime* fields, NOT OpenAPI-safe
export class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(CustomerId),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsertFromDate, // ← crashes OpenAPI
  updated_at: Model.DateTimeUpdateFromDate, // ← crashes OpenAPI
}) {}

// Response DTO (API) — uses DateTimeUtcString, OpenAPI-safe
export class CustomerResponse extends Schema.Class<CustomerResponse>('CustomerResponse')({
  id: CustomerId,
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: DateTimeUtcString, // ← safe
  updated_at: DateTimeUtcString, // ← safe
}) {}
```

### Rule

**Never use `Model.Class` entities directly as `addSuccess()` types if they contain date fields.** Always create a separate `Schema.Class` response DTO with `DateTimeUtcString` for date fields.

## Adding a New API Group

Checklist for adding a new group (e.g., `PaymentGroup`):

1. **Define domain types** in `backend/src/domain/Payment.ts`:
   - Request inputs (`Schema.Class`)
   - Response DTOs (`Schema.Class` with `DateTimeUtcString` for dates)
   - Error classes in `backend/src/domain/http/HttpErrors.ts`

2. **Create API group** in `backend/src/api/PaymentApi.ts`:

   ```ts
   export const PaymentGroup = HttpApiGroup.make('Payments')
     .add(HttpApiEndpoint.post('create', '/api/payments').setPayload(...).addSuccess(...))
   ```

3. **Register in AppApi** — add `.add(PaymentGroup)` to `backend/src/api/AppApi.ts`

4. **Implement handlers** in `backend/src/handlers/PaymentHandlers.ts`:

   ```ts
   export const PaymentHandlersLive = HttpApiBuilder.group(AppApi, 'Payments', (handlers) =>
     handlers.handle('create', ({ payload }) => /* ... */)
   )
   ```

5. **Wire into Router** — add `PaymentHandlersLive` to `HandlersLive` in `backend/src/http/Router.ts`, and add any new use cases / repositories to their respective layer groups.

6. **Verify** — start the server and check `/docs` for the new endpoints.

## Dependencies

| Package                | Version    | Role                                            |
| ---------------------- | ---------- | ----------------------------------------------- |
| `effect`               | `^3.19.16` | Core Effect runtime and Schema                  |
| `@effect/platform`     | `^0.72.2`  | HttpApi, HttpApiBuilder, HttpApiScalar, OpenApi |
| `@effect/platform-bun` | `^0.53.1`  | Bun-specific HTTP server adapter                |
| `@effect/sql`          | `^0.24.3`  | Model.Class, database integration               |

> **Note**: `@effect/platform` is still pre-1.0 and APIs may change between minor versions. Pin versions carefully and test after upgrades.
