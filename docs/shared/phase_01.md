# Phase 1: Shared Effect Schema Package

**Goal**: Create `@laundry-app/shared` workspace package, move public Schema types from backend domain into it, and update the backend to re-export from shared — establishing a single source of truth for API contracts.

**Prerequisites**: None

---

## Tasks

### 1.1 Create `packages/shared/` Package Structure

Create the workspace package scaffolding.

**Create `packages/shared/package.json`:**
```json
{
  "name": "@laundry-app/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "effect": "^3.19.16"
  }
}
```

> **Important**: The shared package depends **only** on `effect`. It must NOT depend on `@effect/platform`, `@effect/sql`, or `@effect/sql-pg` — those are backend-only concerns.

**Create `packages/shared/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### 1.2 Create Shared Source Files

Create the shared type modules. Each file contains **only** public Schema types (branded IDs, `Schema.Class` DTOs, `Schema.Literal` enums). Error types are excluded (they are backend-only and some use `@effect/platform` for HTTP error mapping).

#### `packages/shared/src/common/decimal-number.ts`

Contains:
- `DecimalNumber` — `Schema.transform` for PostgreSQL DECIMAL columns (string → number)

Copied from `backend/src/domain/common/DecimalNumber.ts`.

#### `packages/shared/src/common/datetime.ts`

Contains:
- `DateTimeUtcString` — `Schema.DateTimeUtc` with JSON Schema annotation

Copied from `backend/src/domain/common/DateTimeUtcString.ts`.

#### `packages/shared/src/user.ts`

Contains:
- `UserId` — branded `Schema.String`
- `UserRole` — `Schema.Literal('admin', 'staff')`
- `CreateUserInput` — `Schema.Class` (request)
- `UserWithoutPassword` — `Schema.Class` (response)
- `UserBasicInfo` — `Schema.Class` (response)

**Excluded** (stays in backend):
- `User` — `Model.Class` database entity (depends on `@effect/sql`)

#### `packages/shared/src/auth.ts`

Contains:
- `LoginInput` — `Schema.Class` (request)
- `AuthenticatedUser` — `Schema.Class` (response)
- `AuthResponse` — `Schema.Class` (response)
- `LogoutInput` — `Schema.Class` (request)
- `LogoutResult` — `Schema.Class` (response)
- `RefreshTokenInput` — `Schema.Class` (request)
- `BootstrapInput` — `Schema.Class` (request)

Imports `UserId` and `UserRole` from `./user.ts`.

**Excluded** (stays in backend):
- `JwtPayload` — internal JWT verification concern
- `TokenPair` — internal token rotation concern
- `LoginResult`, `RefreshTokenResult` — type aliases of `AuthResponse`

#### `packages/shared/src/customer.ts`

Contains:
- `CustomerId` — branded `Schema.String`
- `CreateCustomerInput` — `Schema.Class` (request)
- `UpdateCustomerInput` — `Schema.Class` (request)
- `CustomerResponse` — `Schema.Class` (response)
- `CustomerSummary` — `Schema.Class` (response)

Imports `DateTimeUtcString` from `./common/datetime.ts`.

**Excluded** (stays in backend):
- `Customer` — `Model.Class` database entity

#### `packages/shared/src/service.ts`

Contains:
- `ServiceId` — branded `Schema.String`
- `UnitType` — `Schema.Literal('kg', 'set')`
- `CreateLaundryServiceInput` — `Schema.Class` (request)
- `UpdateLaundryServiceInput` — `Schema.Class` (request)
- `ActiveServiceInfo` — `Schema.Class` (response)
- `LaundryServiceResponse` — `Schema.Class` (response)
- `SuccessDeleteService` — `Schema.Class` (response)

Imports `DecimalNumber` from `./common/decimal-number.ts` and `DateTimeUtcString` from `./common/datetime.ts`.

**Excluded** (stays in backend):
- `LaundryService` — `Model.Class` database entity

#### `packages/shared/src/order.ts`

Contains:
- `OrderId` — branded `Schema.String`
- `OrderItemId` — branded `Schema.String`
- `OrderStatus` — `Schema.Literal('received', 'in_progress', 'ready', 'delivered')`
- `PaymentStatus` — `Schema.Literal('paid', 'unpaid')`
- `CreateOrderItemInput` — `Schema.Class` (request)
- `CreateOrderInput` — `Schema.Class` (request)
- `UpdateOrderStatusInput` — `Schema.Class` (request)
- `UpdatePaymentStatusInput` — `Schema.Class` (request)
- `OrderWithDetails` — `Schema.Class` (response)
- `OrderSummary` — `Schema.Class` (response)
- `OrderItemWithService` — `Schema.Class` (response)
- `OrderResponse` — `Schema.Class` (response)
- `OrderItemResponse` — `Schema.Class` (response)
- `OrderWithItemsResponse` — `Schema.Class` (response)

Imports: `CustomerId` from `./customer.ts`, `UserId` from `./user.ts`, `ServiceId` and `UnitType` from `./service.ts`, `DecimalNumber` from `./common/decimal-number.ts`, `DateTimeUtcString` from `./common/datetime.ts`.

**Excluded** (stays in backend):
- `Order` — `Model.Class` database entity
- `OrderItem` — `Model.Class` database entity
- `OrderFilterOptions` — internal query type using `Schema.Option`

#### `packages/shared/src/analytics.ts`

Contains:
- `AnalyticsPaymentFilter` — `Schema.Literal('paid', 'unpaid', 'all')`
- `WeeklyDataPoint` — `Schema.Class` (response)
- `WeeklyAnalyticsResponse` — `Schema.Class` (response)
- `DashboardStatsResponse` — `Schema.Class` (response)

**Excluded** (stays in backend):
- `WeeklyRow` — internal DB row type using `Schema.DateFromSelf` and `DecimalNumber`

#### `packages/shared/src/receipt.ts`

Contains:
- `ReceiptItem` — `Schema.Class` (response)
- `ReceiptResponse` — `Schema.Class` (response)

Imports: `UnitType` from `./service.ts`, `OrderStatus` and `PaymentStatus` from `./order.ts`, `DateTimeUtcString` from `./common/datetime.ts`.

#### `packages/shared/src/index.ts`

Barrel export file re-exporting everything from all modules:
```typescript
export * from './common/decimal-number.js'
export * from './common/datetime.js'
export * from './user.js'
export * from './auth.js'
export * from './customer.js'
export * from './service.js'
export * from './order.js'
export * from './analytics.js'
export * from './receipt.js'
```

### 1.3 Update Root `package.json` Workspaces

**Modify `package.json` (root):**

Update the `workspaces` array to include `packages/shared`:

```json
{
  "workspaces": [
    "packages/shared",
    "backend",
    "frontend"
  ]
}
```

### 1.4 Update `backend/package.json`

**Modify `backend/package.json`:**

Add `@laundry-app/shared` as a workspace dependency:

```json
{
  "dependencies": {
    "@laundry-app/shared": "workspace:*",
    ...existing dependencies
  }
}
```

### 1.5 Update `frontend/package.json`

**Modify `frontend/package.json`:**

Add `effect` and `@laundry-app/shared` as dependencies:

```json
{
  "dependencies": {
    "effect": "^3.19.16",
    "@laundry-app/shared": "workspace:*",
    ...existing dependencies
  }
}
```

> **Note**: The frontend only needs the `effect` package for Schema type inference. It does **not** need `@effect/platform` or `@effect/sql`. The frontend API client remains plain `fetch` + TanStack Query — no Effect runtime is used on the frontend.

### 1.6 Update Backend Domain Files to Re-Export from Shared

Update each backend domain file to import public types from `@laundry-app/shared` and re-export them, keeping internal types (`Model.Class` entities, `Context.Tag`, JWT internals) in the backend.

**Re-export pattern** (applied to each domain file):

```typescript
// backend/src/domain/User.ts — AFTER migration

// Re-export public types from shared (no breaking changes to existing backend imports)
export { UserId, UserRole, CreateUserInput, UserWithoutPassword, UserBasicInfo } from '@laundry-app/shared'

// Import shared types needed by the Model.Class entity
import { UserId, UserRole } from '@laundry-app/shared'

// Internal: Model.Class entity stays in backend (depends on @effect/sql)
import { Schema } from 'effect'
import { Model } from '@effect/sql'

export class User extends Model.Class<User>('User')({
  id: Model.Generated(UserId),
  email: Schema.String,
  password_hash: Schema.String,
  name: Schema.String,
  role: UserRole,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}
```

**Files to update with re-export pattern:**

| Backend File | Re-exports from Shared | Keeps Internally |
|---|---|---|
| `domain/common/DecimalNumber.ts` | `DecimalNumber` | — |
| `domain/common/DateTimeUtcString.ts` | `DateTimeUtcString` | — |
| `domain/User.ts` | `UserId`, `UserRole`, `CreateUserInput`, `UserWithoutPassword`, `UserBasicInfo` | `User` (Model.Class) |
| `domain/Auth.ts` | `LoginInput`, `AuthenticatedUser`, `AuthResponse`, `LogoutInput`, `LogoutResult`, `RefreshTokenInput`, `BootstrapInput` | `JwtPayload`, `TokenPair`, type aliases |
| `domain/Customer.ts` | `CustomerId`, `CreateCustomerInput`, `UpdateCustomerInput`, `CustomerResponse`, `CustomerSummary` | `Customer` (Model.Class) |
| `domain/LaundryService.ts` | `ServiceId`, `UnitType`, `CreateLaundryServiceInput`, `UpdateLaundryServiceInput`, `ActiveServiceInfo`, `LaundryServiceResponse`, `SuccessDeleteService` | `LaundryService` (Model.Class) |
| `domain/Order.ts` | `OrderId`, `OrderItemId`, `OrderStatus`, `PaymentStatus`, `CreateOrderItemInput`, `CreateOrderInput`, `UpdateOrderStatusInput`, `UpdatePaymentStatusInput`, `OrderWithDetails`, `OrderSummary`, `OrderItemWithService`, `OrderResponse`, `OrderItemResponse`, `OrderWithItemsResponse` | `Order` (Model.Class), `OrderItem` (Model.Class), `OrderFilterOptions` |
| `domain/Analytics.ts` | `AnalyticsPaymentFilter`, `WeeklyDataPoint`, `WeeklyAnalyticsResponse`, `DashboardStatsResponse` | `WeeklyRow` |
| `domain/Receipt.ts` | `ReceiptItem`, `ReceiptResponse` | — |

**Unchanged backend files** (no shared types):
- `domain/CurrentUser.ts` — `Context.Tag`, internal
- `domain/AuthError.ts` — backend error types
- `domain/CustomerErrors.ts` — backend error types
- `domain/OrderErrors.ts` — backend error types
- `domain/ServiceErrors.ts` — backend error types
- `domain/UserErrors.ts` — backend error types
- `domain/OrderStatusValidator.ts` — internal business logic
- `domain/OrderNumberGenerator.ts` — internal business logic
- `domain/PhoneNumber.ts` — internal validation utility
- `domain/RefreshToken.ts` — internal token storage entity
- `domain/Health.ts` — internal health check
- `domain/RateLimit.ts` — internal rate limiting
- `domain/http/HttpErrors.ts` — HTTP error definitions

### 1.7 Verify

Run the following commands to verify everything works:

```bash
# Install workspace dependencies
bun install

# Backend typecheck
cd backend && bun run typecheck

# Backend tests
cd backend && bun run test:run

# Frontend typecheck (may have no shared imports yet, but should still compile)
cd frontend && bun run check
```

---

## Public vs Internal Type Classification

| Module | Type | Kind | Location |
|--------|------|------|----------|
| **common** | `DecimalNumber` | Schema.transform | **shared** |
| **common** | `DateTimeUtcString` | Schema.DateTimeUtc (annotated) | **shared** |
| **user** | `UserId` | Branded Schema.String | **shared** |
| **user** | `UserRole` | Schema.Literal | **shared** |
| **user** | `CreateUserInput` | Schema.Class (request) | **shared** |
| **user** | `UserWithoutPassword` | Schema.Class (response) | **shared** |
| **user** | `UserBasicInfo` | Schema.Class (response) | **shared** |
| **user** | `User` | Model.Class (entity) | **backend** |
| **auth** | `LoginInput` | Schema.Class (request) | **shared** |
| **auth** | `AuthenticatedUser` | Schema.Class (response) | **shared** |
| **auth** | `AuthResponse` | Schema.Class (response) | **shared** |
| **auth** | `LogoutInput` | Schema.Class (request) | **shared** |
| **auth** | `LogoutResult` | Schema.Class (response) | **shared** |
| **auth** | `RefreshTokenInput` | Schema.Class (request) | **shared** |
| **auth** | `BootstrapInput` | Schema.Class (request) | **shared** |
| **auth** | `JwtPayload` | Schema.Class (internal) | **backend** |
| **auth** | `TokenPair` | Schema.Class (internal) | **backend** |
| **customer** | `CustomerId` | Branded Schema.String | **shared** |
| **customer** | `CreateCustomerInput` | Schema.Class (request) | **shared** |
| **customer** | `UpdateCustomerInput` | Schema.Class (request) | **shared** |
| **customer** | `CustomerResponse` | Schema.Class (response) | **shared** |
| **customer** | `CustomerSummary` | Schema.Class (response) | **shared** |
| **customer** | `Customer` | Model.Class (entity) | **backend** |
| **service** | `ServiceId` | Branded Schema.String | **shared** |
| **service** | `UnitType` | Schema.Literal | **shared** |
| **service** | `CreateLaundryServiceInput` | Schema.Class (request) | **shared** |
| **service** | `UpdateLaundryServiceInput` | Schema.Class (request) | **shared** |
| **service** | `ActiveServiceInfo` | Schema.Class (response) | **shared** |
| **service** | `LaundryServiceResponse` | Schema.Class (response) | **shared** |
| **service** | `SuccessDeleteService` | Schema.Class (response) | **shared** |
| **service** | `LaundryService` | Model.Class (entity) | **backend** |
| **order** | `OrderId` | Branded Schema.String | **shared** |
| **order** | `OrderItemId` | Branded Schema.String | **shared** |
| **order** | `OrderStatus` | Schema.Literal | **shared** |
| **order** | `PaymentStatus` | Schema.Literal | **shared** |
| **order** | `CreateOrderItemInput` | Schema.Class (request) | **shared** |
| **order** | `CreateOrderInput` | Schema.Class (request) | **shared** |
| **order** | `UpdateOrderStatusInput` | Schema.Class (request) | **shared** |
| **order** | `UpdatePaymentStatusInput` | Schema.Class (request) | **shared** |
| **order** | `OrderWithDetails` | Schema.Class (response) | **shared** |
| **order** | `OrderSummary` | Schema.Class (response) | **shared** |
| **order** | `OrderItemWithService` | Schema.Class (response) | **shared** |
| **order** | `OrderResponse` | Schema.Class (response) | **shared** |
| **order** | `OrderItemResponse` | Schema.Class (response) | **shared** |
| **order** | `OrderWithItemsResponse` | Schema.Class (response) | **shared** |
| **order** | `Order` | Model.Class (entity) | **backend** |
| **order** | `OrderItem` | Model.Class (entity) | **backend** |
| **order** | `OrderFilterOptions` | Schema.Class (internal) | **backend** |
| **analytics** | `AnalyticsPaymentFilter` | Schema.Literal | **shared** |
| **analytics** | `WeeklyDataPoint` | Schema.Class (response) | **shared** |
| **analytics** | `WeeklyAnalyticsResponse` | Schema.Class (response) | **shared** |
| **analytics** | `DashboardStatsResponse` | Schema.Class (response) | **shared** |
| **analytics** | `WeeklyRow` | Schema.Class (internal DB) | **backend** |
| **receipt** | `ReceiptItem` | Schema.Class (response) | **shared** |
| **receipt** | `ReceiptResponse` | Schema.Class (response) | **shared** |

---

## Files Summary

| Action | File |
|--------|------|
| Create | `packages/shared/package.json` |
| Create | `packages/shared/tsconfig.json` |
| Create | `packages/shared/src/common/decimal-number.ts` |
| Create | `packages/shared/src/common/datetime.ts` |
| Create | `packages/shared/src/user.ts` |
| Create | `packages/shared/src/auth.ts` |
| Create | `packages/shared/src/customer.ts` |
| Create | `packages/shared/src/service.ts` |
| Create | `packages/shared/src/order.ts` |
| Create | `packages/shared/src/analytics.ts` |
| Create | `packages/shared/src/receipt.ts` |
| Create | `packages/shared/src/index.ts` |
| Modify | `package.json` (root — add `packages/shared` to workspaces) |
| Modify | `backend/package.json` (add `@laundry-app/shared` dependency) |
| Modify | `frontend/package.json` (add `effect` + `@laundry-app/shared` dependency) |
| Modify | `backend/src/domain/common/DecimalNumber.ts` (re-export from shared) |
| Modify | `backend/src/domain/common/DateTimeUtcString.ts` (re-export from shared) |
| Modify | `backend/src/domain/User.ts` (re-export public, keep `User` Model.Class) |
| Modify | `backend/src/domain/Auth.ts` (re-export public, keep `JwtPayload`, `TokenPair`) |
| Modify | `backend/src/domain/Customer.ts` (re-export public, keep `Customer` Model.Class) |
| Modify | `backend/src/domain/LaundryService.ts` (re-export public, keep `LaundryService` Model.Class) |
| Modify | `backend/src/domain/Order.ts` (re-export public, keep `Order`, `OrderItem`, `OrderFilterOptions`) |
| Modify | `backend/src/domain/Analytics.ts` (re-export public, keep `WeeklyRow`) |
| Modify | `backend/src/domain/Receipt.ts` (re-export all — no internal types) |

## Acceptance Criteria

- [ ] `bun install` resolves `@laundry-app/shared` as a workspace package
- [ ] `packages/shared/` has no dependency on `@effect/platform`, `@effect/sql`, or `@effect/sql-pg`
- [ ] Backend `bun run typecheck` passes with re-export pattern
- [ ] Backend `bun run test:run` passes with no changes to test files
- [ ] All existing backend `import { X } from '@domain/...'` paths continue to work (re-exports are transparent)
- [ ] Frontend `bun run check` passes (no shared imports yet, but workspace resolves)
- [ ] Shared barrel export (`packages/shared/src/index.ts`) exports all public types

## Dependencies

None — this is a foundational phase.
