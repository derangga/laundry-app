# @laundry-app/shared

Public Effect Schema types shared between backend and frontend.

## Purpose

This package contains the **single source of truth** for API contract types used across the laundry management application. It establishes type safety boundaries between the backend and frontend, ensuring consistent data validation and serialization.

## What Belongs Here

### ✅ Include

- **Branded IDs**: Type-safe identifiers (`UserId`, `CustomerId`, `ServiceId`, `OrderId`, etc.)
- **Schema Enums**: Literal types for controlled vocabularies (`UserRole`, `OrderStatus`, `PaymentStatus`, `UnitType`, etc.)
- **Request DTOs**: Input schemas for API endpoints (`CreateUserInput`, `LoginInput`, `CreateOrderInput`, etc.)
- **Response DTOs**: Output schemas for API responses (`UserWithoutPassword`, `OrderResponse`, `CustomerResponse`, etc.)
- **Common Transforms**: Reusable schema transformations (`DecimalNumber`, `DateTimeUtcString`)

### ❌ Exclude (Keep in Backend)

- **`Model.Class` Entities**: Database entities that depend on `@effect/sql` or `@effect/sql-pg`
- **`Context.Tag` Services**: Service layer definitions and dependency injection tags
- **Internal Types**: JWT payloads, session data, filter options, database row types
- **Error Classes**: Domain-specific errors (use `@effect/platform` for HTTP error mapping)
- **Repository Logic**: Database queries and transaction management
- **Business Logic**: Use case implementations and domain rules

## Package Structure

```
packages/shared/
├── src/
│   ├── common/
│   │   ├── decimal-number.ts    # Decimal number transform
│   │   └── datetime.ts          # UTC datetime string schema
│   ├── user.ts                  # User types and schemas
│   ├── auth.ts                  # Authentication types
│   ├── customer.ts              # Customer types
│   ├── service.ts               # Laundry service types
│   ├── order.ts                 # Order and order item types
│   ├── analytics.ts             # Analytics and dashboard types
│   ├── receipt.ts               # Receipt types
│   └── index.ts                 # Barrel export
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

**Minimal Runtime Dependencies:**
- `effect` ^3.19.16 — Core Effect library for Schema definitions

**No Dependencies On:**
- ❌ `@effect/platform` — HTTP/platform-specific features
- ❌ `@effect/sql` — Database abstractions
- ❌ `@effect/sql-pg` — PostgreSQL driver

This minimal dependency footprint ensures the shared package:
- Works in browser environments (frontend)
- Has fast installation and minimal bundle size
- Avoids Node.js-specific or database-specific code

## Usage

### Backend Usage

The backend re-exports all shared types through its domain layer. This means existing backend code continues to work without changes:

```typescript
// Option 1: Import from shared package directly
import { UserId, UserRole, CreateUserInput } from '@laundry-app/shared'

// Option 2: Import through backend domain layer (recommended for backend code)
import { UserId, UserRole, CreateUserInput } from '@domain/User'
// ↑ This works because domain files re-export from shared

// Example: Use in a use case
class CreateUserUseCase extends Effect.Service<CreateUserUseCase>()('CreateUserUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: (input: CreateUserInput) =>
        Effect.gen(function* () {
          // Validate input using Schema
          const validated = yield* Schema.decodeUnknown(CreateUserInput)(input)
          // ... business logic
        }),
    }
  }),
}) {}
```

### Frontend Usage

The frontend imports directly from the shared package for type-safe API client code:

```typescript
import {
  LoginInput,
  AuthResponse,
  CreateCustomerInput,
  CustomerResponse
} from '@laundry-app/shared'

// Example: TanStack Query with type-safe API calls
async function loginUser(credentials: typeof LoginInput.Type) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) throw new Error('Login failed')

  // Parse and validate response using Schema
  const data = await response.json()
  return Schema.decodeUnknownSync(AuthResponse)(data)
}

// Example: TanStack Start route with validated input
export const Route = createFileRoute('/customers/new')({
  component: NewCustomer,
  async action({ data }: { data: FormData }) {
    const input = {
      name: data.get('name'),
      phone: data.get('phone'),
      address: data.get('address'),
    }

    // Validate input using Schema
    const validated = Schema.decodeUnknownSync(CreateCustomerInput)(input)

    // Make API call
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    })

    return Schema.decodeUnknownSync(CustomerResponse)(await response.json())
  },
})
```

## Type Safety Features

### Branded Types

Branded types prevent accidental ID misuse:

```typescript
import { UserId, CustomerId } from '@laundry-app/shared'

const userId: UserId = '123' as UserId  // ✓ OK
const customerId: CustomerId = '456' as CustomerId  // ✓ OK

function getUser(id: UserId) { /* ... */ }

getUser(userId)      // ✓ OK
getUser(customerId)  // ✗ Type error: CustomerId is not assignable to UserId
```

### Schema Validation

Effect Schema provides runtime validation and type inference:

```typescript
import { Schema } from 'effect'
import { CreateUserInput } from '@laundry-app/shared'

// Validate unknown data at runtime
const result = Schema.decodeUnknown(CreateUserInput)({
  email: 'user@example.com',
  password: 'secret123',
  name: 'John Doe',
  role: 'admin',
})

// result: Effect<CreateUserInput, ParseError>

// Sync validation (throws on error)
const validated = Schema.decodeUnknownSync(CreateUserInput)({
  email: 'user@example.com',
  password: 'secret123',
  name: 'John Doe',
  role: 'admin',
})

// validated: CreateUserInput (type-safe)
```

### Literal Types

Literal types ensure only valid values are used:

```typescript
import { UserRole, OrderStatus } from '@laundry-app/shared'

type UserRole = typeof UserRole.Type  // 'admin' | 'staff'
type OrderStatus = typeof OrderStatus.Type  // 'received' | 'in_progress' | 'ready' | 'delivered'

const role: UserRole = 'admin'  // ✓ OK
const role2: UserRole = 'customer'  // ✗ Type error
```

## Adding New Types

When adding new API endpoints or features, follow this workflow:

1. **Define shared types first** in `packages/shared/src/`
   - Create a new file or extend existing ones
   - Use `Schema.Class` for DTOs, `Schema.brand()` for IDs, `Schema.Literal` for enums
   - Add JSDoc comments for better IDE experience

2. **Export from barrel** (`packages/shared/src/index.ts`)
   ```typescript
   export * from './new-feature.js'
   ```

3. **Re-export in backend domain** (if applicable)
   - Create/update corresponding backend domain file
   - Re-export public types, keep internal types separate

4. **Use in backend** (repositories, use cases, handlers)
   - Import from backend domain layer
   - Add backend-specific types (Model.Class entities, errors, etc.)

5. **Use in frontend** (API clients, forms, routes)
   - Import directly from `@laundry-app/shared`
   - Use Schema validation for runtime safety

### Example: Adding a New Feature

Let's say we're adding a "Promotions" feature:

**Step 1: Define in shared** (`packages/shared/src/promotion.ts`)
```typescript
import { Schema } from 'effect'

import { DateTimeUtcString } from './common/datetime.js'

/**
 * Branded type for Promotion IDs.
 */
export const PromotionId = Schema.String.pipe(Schema.brand('PromotionId'))
export type PromotionId = typeof PromotionId.Type

/**
 * Promotion type enumeration.
 * - `percentage`: Percentage discount
 * - `fixed`: Fixed amount discount
 */
export const PromotionType = Schema.Literal('percentage', 'fixed')
export type PromotionType = typeof PromotionType.Type

/**
 * Input schema for creating a promotion.
 */
export class CreatePromotionInput extends Schema.Class<CreatePromotionInput>('CreatePromotionInput')({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  type: PromotionType,
  value: Schema.Number,
  start_date: DateTimeUtcString,
  end_date: DateTimeUtcString,
}) {}

/**
 * Promotion response schema.
 */
export class PromotionResponse extends Schema.Class<PromotionResponse>('PromotionResponse')({
  id: PromotionId,
  name: Schema.String,
  type: PromotionType,
  value: Schema.Number,
  start_date: DateTimeUtcString,
  end_date: DateTimeUtcString,
  is_active: Schema.Boolean,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}
```

**Step 2: Export in barrel** (`packages/shared/src/index.ts`)
```typescript
export * from './promotion.js'
```

**Step 3: Re-export in backend domain** (`backend/src/domain/Promotion.ts`)
```typescript
import { Model } from 'effect'

// Re-export public types from shared
export {
  PromotionId,
  type PromotionId as PromotionIdType,
  PromotionType,
  type PromotionType as PromotionTypeValue,
  CreatePromotionInput,
  PromotionResponse,
} from '@laundry-app/shared'

// Backend-only: Database entity
export class Promotion extends Model.Class<Promotion>('Promotion')({
  id: Model.String,
  name: Model.String,
  type: Model.String,
  value: Model.Number,
  start_date: Model.String,
  end_date: Model.String,
  is_active: Model.Boolean,
  created_at: Model.String,
  updated_at: Model.String,
}) {}
```

## Development

**Type checking:**
```bash
# From repo root
bun run typecheck

# Or specific to shared package
cd packages/shared
bun run build
```

**Testing:**
Since this package contains only type definitions, testing happens at the integration level:
- Backend tests validate request/response schemas
- Frontend tests validate API client type safety

## Migration Notes

### Migrating Backend Code

No changes needed! Backend domain files re-export shared types, so existing import paths continue to work:

```typescript
// Before (still works)
import { UserId, UserRole, CreateUserInput } from '@domain/User'

// After (equivalent)
import { UserId, UserRole, CreateUserInput } from '@laundry-app/shared'
```

### Migrating Frontend Code

Replace ad-hoc type definitions with shared schemas:

```typescript
// Before (manual types)
interface LoginRequest {
  email: string
  password: string
}

async function login(data: LoginRequest) {
  return fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// After (shared types with validation)
import { Schema } from 'effect'
import { LoginInput, AuthResponse } from '@laundry-app/shared'

async function login(data: typeof LoginInput.Type) {
  // Validate input
  const validated = Schema.decodeUnknownSync(LoginInput)(data)

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  })

  // Validate response
  const json = await response.json()
  return Schema.decodeUnknownSync(AuthResponse)(json)
}
```

## Design Principles

1. **Single Source of Truth**: API contracts defined once, used everywhere
2. **Minimal Dependencies**: Only `effect` for maximum portability
3. **Type Safety**: Branded types prevent ID confusion
4. **Runtime Validation**: Schema validation catches errors early
5. **Documentation**: JSDoc comments improve developer experience
6. **Backward Compatibility**: Backend re-exports maintain existing imports

## Related Documentation

- [`docs/PRD.md`](../../docs/PRD.md) — Product requirements and API specifications
- [`docs/ADR_BACKEND.md`](../../docs/ADR_BACKEND.md) — Backend architecture decisions
- [`docs/CONTEXT.md`](../../docs/CONTEXT.md) — Effect patterns and service composition
- [`docs/shared/phase_01.md`](../../docs/shared/phase_01.md) — Shared modules implementation plan
- [Effect Schema Documentation](https://effect.website/docs/schema/introduction)

---

**Version**: 1.0.0
**License**: UNLICENSED (Private)
**Maintainer**: Laundry App Team
