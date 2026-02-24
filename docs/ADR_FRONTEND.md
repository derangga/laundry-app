# Frontend Architecture Decision Record

**Status**: Proposed
**Date**: 2026-02-23
**Authors**: Development Team
**Version**: 1.0

## Document Information

This ADR documents the architectural decisions for the laundry management application frontend. It covers authentication, routing, state management, API layer design, component architecture, error handling, and role-based access control.

## 1. Executive Summary

### Technology Stack Overview

- **Meta-Framework**: TanStack Start (v1.132.0) with file-based routing
- **UI Framework**: React 19
- **Styling**: Tailwind CSS v4 with OKLCH color system (zinc base)
- **Component Library**: shadcn/ui (new-york style)
- **Data Fetching**: TanStack Query (v5.66.5)
- **Tables**: TanStack Table (v8.21.2)
- **Charts**: Recharts (v2.15.4)
- **Icons**: lucide-react
- **Toasts**: Sonner
- **Build**: Vite 7

### Key Architectural Choices

1. **Custom JWT auth layer** against the existing backend (no third-party auth library)
2. **TanStack Router file-based routing** with pathless layout route for auth guard
3. **TanStack Query as sole server-state manager** — no Redux/Zustand
4. **Single fetch wrapper** with automatic token refresh on 401
5. **Simplified atomic design** for component organization
6. **Sonner toasts** for all user-facing notifications
7. **Route-level and component-level role guards** for RBAC

---

## 2. Architectural Decisions

### Decision 1: Authentication Strategy

#### Context

The backend uses JWT access tokens (15min expiry, Bearer header) and refresh tokens (7 days, sent in request body). The frontend must store tokens, attach them to API requests, handle transparent refresh when access tokens expire, and redirect to login when the session is fully expired.

Key backend implementation verified by code review:
- **`GET /api/auth/me` endpoint** — being added in backend phase 14 (`docs/backend_roadmap/phase_14.md`). Returns `{ id, email, name, role }` from the JWT token
- **`AuthMiddleware`** uses `HttpApiSecurity.bearer` — reads from `Authorization: Bearer` header, NOT cookies
- **Cookie helpers exist but are unused** — `setAuthCookies`/`clearAuthCookies` defined in `CookieHelper.ts` but never called in `AuthHandlers.ts` (line 24: "Cookies are managed by the client")
- **Tokens returned in response body** — login/refresh return `AuthResponse { accessToken, refreshToken, user }`
- **Refresh endpoint** accepts `{ refreshToken }` in request body (cookie fallback exists via `extractRefreshTokenFromCookie` but not primary)

#### Decision

Build a custom auth layer:
- Store the **access token in memory** (module-scoped variable) — immune to XSS, cleared on page refresh
- Store the **refresh token in localStorage** — survives page refresh, 7-day lifetime
- Cache **user profile data** in TanStack Query via `GET /api/auth/me` (added in backend phase 14)
- On page load: call `GET /api/auth/me` (if access token exists) → if 401, attempt refresh → restore session
- On 401: auto-refresh once and retry the original request

#### Rationale

- **In-memory access token**: Short-lived (15min), no XSS exposure via localStorage/sessionStorage
- **localStorage for refresh token**: The backend returns tokens in response body (not cookies), so the frontend manages storage. localStorage is chosen over sessionStorage to survive page refresh. This is acceptable for an internal staff/admin app with controlled access.
- **TanStack Query for user data**: `useCurrentUser()` calls `GET /api/auth/me` — provides reactive access to user info without a separate state library. Invalidated on login/logout
- **No Better Auth**: The backend already owns the full JWT system with custom endpoints. Better Auth requires its own server endpoints (`/api/auth/sign-in/email`) which are incompatible with the existing Effect backend API

#### Implementation

```
frontend/src/lib/auth.ts          — getAccessToken(), setAccessToken(), getRefreshToken(), setRefreshToken(), clearTokens()
frontend/src/lib/api-client.ts    — apiClient() with Bearer header, 401 auto-refresh, retry logic
frontend/src/api/auth.ts          — authKeys, loginFn, refreshFn, logoutFn, useCurrentUser, useLogin, useLogout
```

#### Auth Flow

```
Page Load → GET /api/auth/me (if accessToken exists in memory)
  → Success: cache user in TanStack Query, proceed to dashboard
  → 401: read refreshToken from localStorage
    → POST /api/auth/refresh { refreshToken }
      → Success: store new tokens, cache user, proceed to dashboard
      → Failure: clear tokens, redirect to /login

Login → POST /api/auth/login { email, password }
  → Success: store tokens (memory + localStorage), cache user, redirect to /
  → Failure: show Sonner toast "Wrong email or password"

API Request → attach Authorization: Bearer <accessToken>
  → 401 Response: attempt refresh → retry original request
    → Refresh fails: clear tokens, redirect to /login

Logout → POST /api/auth/logout { refreshToken } with Bearer header
  → Clear all tokens, remove user from query cache, redirect to /login
```

#### Alternatives Considered

- **Better Auth library**: Full-stack solution requiring its own server endpoints — incompatible with existing backend
- **localStorage for access token**: XSS-vulnerable for the short-lived token; unnecessary since memory works
- **Cookie-only**: Backend doesn't set httpOnly cookies (dead code), so this isn't an option without backend changes

---

### Decision 2: Routing Architecture

#### Context

TanStack Router uses file-based routing. The app needs a public route (`/login`) and a protected dashboard area with a shared sidebar layout. Protected routes must redirect to `/login` if unauthenticated.

#### Decision

Use TanStack Router's **pathless layout route** pattern with a `_dashboard` layout route that wraps all authenticated pages. The login page sits outside this layout. Auth checks happen in `beforeLoad` of the dashboard layout route.

#### Route Structure

```
frontend/src/routes/
  __root.tsx              # HTML shell, QueryProvider, Toaster
  login.tsx               # Public login page (redirects to / if already authed)
  _dashboard.tsx          # Pathless layout: auth guard + SidebarProvider + SidebarInset
  _dashboard/
    index.tsx             # Home dashboard — active orders table
    history.tsx           # Order history with filters/pagination
    analytics.tsx         # Admin-only — revenue & order charts
    staff.tsx             # Admin-only — register staff/admin
```

#### Rationale

- **Clean separation**: Login renders without sidebar; dashboard adds sidebar via layout route
- **Single auth guard**: `beforeLoad` in `_dashboard.tsx` runs once for all child routes
- **Pathless layout**: Dashboard routes mount at `/`, `/history`, `/analytics`, `/staff` (no `/dashboard` prefix)
- **Type-safe navigation**: TanStack Router generates route types from the file structure

#### Implementation

```typescript
// _dashboard.tsx beforeLoad
beforeLoad: async ({ context }) => {
  // 1. Check query cache for user
  // 2. If missing, attempt refresh (read refreshToken from localStorage)
  // 3. If refresh fails, throw redirect({ to: '/login' })
}
```

---

### Decision 3: State Management

#### Context

The app needs to manage server state (orders, customers, analytics data) and minimal client state (sidebar open/close, form inputs, modal visibility).

#### Decision

Use **TanStack Query exclusively** for server state. Use **React `useState`/`useReducer`** for local UI state. No global client state library.

#### Rationale

- **Server state** (90%+ of state needs): TanStack Query handles caching, refetching, invalidation, loading/error states, optimistic updates
- **Client state**: Sidebar toggle, form fields, modal open/close — all local to components, React built-in state is sufficient
- **User auth data**: Stored as a TanStack Query entry, accessible anywhere via `useCurrentUser()` hook

#### Query Key Convention

```typescript
// frontend/src/api/auth.ts
export const authKeys = {
  all: ['auth'] as const,
  user: ['auth', 'user'] as const,
}

// frontend/src/api/orders.ts
export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  active: () => ['orders', 'active'] as const,
}

// frontend/src/api/analytics.ts
export const analyticsKeys = {
  all: ['analytics'] as const,
  weekly: (params: WeeklyParams) => ['analytics', 'weekly', params] as const,
  dashboard: () => ['analytics', 'dashboard'] as const,
}
```

---

### Decision 4: API Layer

#### Context

The frontend communicates with the backend REST API at `http://localhost:3000`. All authenticated endpoints require a Bearer token. Token refresh must be transparent to consuming code.

#### Decision

Create a single **`apiClient` fetch wrapper** in `frontend/src/lib/api-client.ts` that handles auth headers, auto-refresh, and typed errors. Domain-specific API modules in `frontend/src/api/` wrap `apiClient` and export TanStack Query hooks.

#### Implementation

```
frontend/src/lib/api-client.ts    — Core fetch wrapper
frontend/src/api/auth.ts          — Auth endpoints + hooks
frontend/src/api/orders.ts        — Order endpoints + hooks
frontend/src/api/customers.ts     — Customer endpoints + hooks (future)
frontend/src/api/services.ts      — Service endpoints + hooks (future)
frontend/src/api/analytics.ts     — Analytics endpoints + hooks
```

**apiClient responsibilities:**
1. Prepend base URL (`http://localhost:3000`)
2. Attach `Authorization: Bearer <token>` header
3. Set `Content-Type: application/json`
4. On 401: attempt `POST /api/auth/refresh` with body `{ refreshToken }`, retry original request
5. Parse JSON response
6. Throw typed `ApiError { status, code, message }` on non-OK responses

**Each API module exports:**
1. Query key factory (e.g., `orderKeys`)
2. Raw fetch functions (e.g., `fetchOrders`)
3. TanStack Query hooks (e.g., `useActiveOrders`, `useUpdateOrderStatus`)

#### Backend Response Shapes (from API_TEST.md)

```typescript
// GET /api/orders → OrderWithDetails[]
{ id, order_number, customer_id, customer_name, customer_phone,
  status, payment_status, total_price, created_by, created_by_name,
  created_at, updated_at }

// PUT /api/orders/:id/status → OrderResponse
{ id, order_number, customer_id, status, payment_status,
  total_price, created_by, created_at, updated_at }

// GET /api/analytics/weekly → WeeklyAnalyticsResponse
{ weeks: [{ week_start, total_revenue, order_count }],
  start_date, end_date, payment_filter }

// GET /api/analytics/dashboard → DashboardStatsResponse
{ todays_orders, pending_payments, weekly_revenue, total_customers }
```

**Important**: `GET /api/orders` returns a flat array with no pagination wrapper. Pagination is handled client-side using TanStack Table's `getPaginationRowModel()`.

---

### Decision 5: Component Architecture

#### Context

The project needs a scalable component structure. Multiple pages share patterns (tables, badges, forms). The user requires atomic design principles and components under `frontend/src/components/`.

#### Decision

Use a **simplified atomic design** with three directories:

```
frontend/src/components/
  layout/                 # App shell — rendered once in dashboard layout
    app-sidebar.tsx       # Sidebar with nav items
    nav-user.tsx          # User dropdown in sidebar footer
    breadcrumb-nav.tsx    # Breadcrumb from current route
  shared/                 # Reusable across features
    status-badge.tsx      # Order status badge (color-coded)
    payment-badge.tsx     # Payment status badge (paid/unpaid)
    data-table.tsx        # Generic TanStack Table wrapper
    empty-state.tsx       # Empty data placeholder (icon + title + description)
    error-state.tsx       # Error placeholder (message + retry button)
  features/               # Feature-specific composites
    orders/
      order-table-columns.tsx
      order-filters.tsx
    analytics/
      stats-cards.tsx
      revenue-chart.tsx
      order-chart.tsx
    staff/
      register-staff-form.tsx
```

**shadcn/ui primitives** remain in `frontend/#/components/ui/` (managed by shadcn CLI via `#/` import alias).

#### Naming Conventions

- Files: `kebab-case.tsx`
- Components: `PascalCase` exports
- Hooks: `camelCase` starting with `use`

#### Rationale

- `layout/` — Sidebar, header, breadcrumb; rendered once in the `_dashboard` layout route
- `shared/` — Components reused across multiple features (badges, table wrapper, skeletons)
- `features/` — Components specific to one page but complex enough to extract from the route file
- shadcn primitives stay separate — managed by CLI, not manually edited

---

### Decision 6: Error Handling, Empty States, and Loading States

#### Context

The backend returns errors with `code` and `message` properties. The frontend must handle every possible UI state: loading, success with data, success with empty data, and error. Every query and mutation must have explicit handling for all states — no silent failures or blank screens.

#### Decision

Use a **three-layer strategy** for all data-driven UI:

1. **Empty State** — dedicated `<EmptyState />` component shown when a query succeeds but returns no data
2. **Error State** — dedicated `<ErrorState />` component shown when a query fails, with retry button
3. **Toast Notifications** — Sonner toasts for mutation results (success/error) and non-recoverable errors

Every page that fetches data MUST handle all three states explicitly.

#### UI State Matrix

Every data-fetching component handles these states:

| State | UI |
|-------|-----|
| Loading | Skeleton placeholders (shimmer effect via shadcn `Skeleton`) |
| Success + has data | Render data (table, chart, cards) |
| Success + empty data | `<EmptyState />` with icon, message, optional action |
| Error | `<ErrorState />` with error message and "Try again" button |

#### Shared State Components

**`components/shared/empty-state.tsx`:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode     // lucide-react icon
  title: string              // "No active orders"
  description?: string       // "Orders with status received or in progress will appear here"
  action?: React.ReactNode   // Optional CTA button
}
```

**`components/shared/error-state.tsx`:**
```typescript
interface ErrorStateProps {
  title?: string             // Default: "Something went wrong"
  description?: string       // Error message from API or default
  onRetry?: () => void       // Calls query.refetch()
}
```

#### Toast Notification Rules

| Trigger | Toast Type | Example |
|---------|------------|---------|
| Mutation success | `toast.success()` | "Order status updated" |
| Mutation error | `toast.error()` | "Failed to update order status" |
| Auth error (after refresh fails) | `toast.error()` | "Session expired. Please log in again." |
| Permission denied (403) | `toast.error()` | "You don't have permission to perform this action" |
| Network/server error (500) | `toast.error()` | "Something went wrong. Please try again." |
| Form validation (client-side) | Inline error text | Shown below the invalid field, NOT as toast |

#### API Error Mapping

| Status | Behavior |
|--------|----------|
| 401 | Auto-refresh token → retry. If refresh fails: clear tokens, redirect to `/login`, toast "Session expired" |
| 403 | Toast: "You don't have permission to perform this action" |
| 404 | Toast with backend message (e.g., "Order not found") |
| 409 | Toast with backend message (e.g., "User already exists with email: ...") |
| 400 | Inline form errors when field info available, otherwise toast with backend message |
| 500 | Toast: "Something went wrong. Please try again." |

#### Implementation

```typescript
// ApiError class in lib/api-client.ts
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

// Query pattern — always handle loading, empty, and error
function OrdersPage() {
  const { data, isLoading, isError, error, refetch } = useActiveOrders()

  if (isLoading) return <DataTableSkeleton />
  if (isError) return <ErrorState description={error.message} onRetry={refetch} />
  if (!data || data.length === 0) {
    return <EmptyState icon={<Inbox />} title="No active orders"
      description="Orders with status received or in progress will appear here." />
  }
  return <DataTable columns={columns} data={data} />
}

// Mutation pattern — always toast success and error
useMutation({
  mutationFn: updateOrderStatus,
  onSuccess: () => {
    toast.success('Order status updated')
    queryClient.invalidateQueries({ queryKey: orderKeys.all })
  },
  onError: (error: ApiError) => {
    toast.error(error.message)
  },
})
```

#### Page-by-Page State Handling

| Page | Loading State | Empty State | Error State |
|------|--------------|-------------|-------------|
| Dashboard (Home) | Skeleton table rows | "No active orders" with Inbox icon | Error message + retry button |
| History Order | Skeleton table rows | "No orders found" (may vary with filters) | Error message + retry button |
| Analytics — Stats | 4 skeleton cards | N/A (stats always return numbers) | Error message + retry button |
| Analytics — Charts | Skeleton chart area | "No data for selected period" | Error message + retry button |
| Manage Staff | N/A (form page) | N/A | Toast on submit error |
| Login | Loading spinner on button | N/A | Toast "Wrong email or password" |

---

### Decision 7: Role-Based Access Control

#### Context

The backend enforces two roles: `admin` (full access) and `staff` (limited — no analytics, no service CRUD, no user management). The frontend must protect routes and hide UI elements accordingly.

#### Decision

Apply RBAC at two levels:

**Route-level** — `beforeLoad` in route definitions for admin-only pages:
```typescript
// _dashboard/analytics.tsx
beforeLoad: async ({ context }) => {
  const user = context.queryClient.getQueryData(authKeys.user)
  if (user?.role !== 'admin') {
    throw redirect({ to: '/' })
  }
}
```

**Component-level** — `useCurrentUser()` hook for conditional rendering:
```typescript
// In app-sidebar.tsx
const { data: user } = useCurrentUser()

// Render admin-only menu items conditionally
{user?.role === 'admin' && <SidebarMenuItem>Analytics</SidebarMenuItem>}
{user?.role === 'admin' && <SidebarMenuItem>Manage Staff</SidebarMenuItem>}
```

#### Role Access Matrix

| Feature | Admin | Staff |
|---------|-------|-------|
| Home Dashboard (active orders) | yes | yes |
| History Order (all orders) | yes | yes |
| Update order status/payment | yes | yes |
| Analytics page | yes | no |
| Manage Staff page | yes | no |

### Decision 8: Shared Effect Schema Package

#### Context

The backend uses Effect `Schema.Class` for all domain types — branded IDs, request DTOs, response DTOs, and enum literals. The frontend originally planned to create plain TypeScript interfaces in `frontend/src/domain/` that duplicate these shapes. This duplication introduces drift risk: any backend schema change (renamed field, new enum value, added property) requires a manual, synchronized update on the frontend.

#### Decision

Create a `@laundry-app/shared` workspace package (`packages/shared/`) that exports Effect Schema types as the single source of truth for API contracts. The frontend imports schemas from this shared package instead of maintaining its own domain type definitions.

**Key constraints:**
- The shared package depends **only** on `effect` — no `@effect/platform`, `@effect/sql`, or other backend-only packages
- The frontend API client remains plain `fetch` + TanStack Query — no Effect runtime on the frontend
- Effect Schema types are used purely for TypeScript type inference on the frontend (e.g., `typeof LoginInput.Type`)
- Internal backend types (`Model.Class` entities, `Context.Tag` services, error classes) stay in the backend

#### Frontend Import Pattern

```typescript
// frontend/src/api/orders.ts
import type { OrderWithDetails, UpdateOrderStatusInput } from '@laundry-app/shared'

// Use the types for TanStack Query hooks and fetch functions
export function fetchOrders(): Promise<OrderWithDetails[]> {
  return apiClient('/api/orders')
}
```

#### Rationale

- **Single source of truth**: One schema definition drives both backend validation and frontend types — no drift
- **Type-safe API contracts**: Frontend gets exact types including branded IDs, literal unions, and optional fields
- **Runtime validation available if needed**: Frontend can optionally use `Schema.decode` for response validation
- **Tree-shakeable**: Unused schemas are excluded from the frontend bundle by Vite
- **No frontend weight**: The `effect` package is the only additional dependency; no Effect runtime overhead

#### Alternatives Considered

- **Plain TypeScript interfaces** (original plan): Simple to write but duplicates backend types, high drift risk, no runtime validation option
- **Full Effect on frontend**: Using Effect runtime for API calls — too heavy for a simple React SPA, unnecessary complexity
- **Codegen from OpenAPI**: The backend doesn't generate OpenAPI specs, and adding generation would require additional tooling and build steps

**Update (2026-02-24)**: After authentication implementation review, confirmed that shared package is correctly set up. Frontend imports types from `@laundry-app/shared` for all API contracts. No changes needed.

---

## 3. Project Structure

```
laundry-app/
  packages/
    shared/                     # @laundry-app/shared — Effect Schema types
      src/
        common/                 # DecimalNumber, DateTimeUtcString
        user.ts                 # UserId, UserRole, CreateUserInput, ...
        auth.ts                 # LoginInput, AuthResponse, ...
        customer.ts             # CustomerId, CustomerResponse, ...
        service.ts              # ServiceId, UnitType, ...
        order.ts                # OrderStatus, PaymentStatus, OrderWithDetails, ...
        analytics.ts            # WeeklyAnalyticsResponse, DashboardStatsResponse, ...
        receipt.ts              # ReceiptItem, ReceiptResponse
        index.ts                # Barrel export
  frontend/
    src/
      routes/                   # TanStack Router file-based routes
        __root.tsx              # HTML shell, providers, Toaster
        login.tsx               # Public login page
        _dashboard.tsx          # Authenticated layout (sidebar-inset)
        _dashboard/
          index.tsx             # Home — active orders table
          history.tsx           # Order history with filters
          analytics.tsx         # Admin — charts + stats
          staff.tsx             # Admin — register staff
      components/
        layout/                 # App shell (sidebar, nav-user, breadcrumb)
        shared/                 # Reusable (badges, data-table, skeletons)
        features/               # Feature-specific composites
      api/                      # API modules (query keys + fetch functions + hooks)
        auth.ts
        orders.ts
        analytics.ts
      lib/                      # Utilities
        api-client.ts           # Fetch wrapper with auth
        auth.ts                 # Token management (memory + localStorage)
        utils.ts                # cn() utility (existing)
        constants.ts            # Status labels, color maps, formatCurrency
      hooks/                    # Shared React hooks
      integrations/
        tanstack-query/         # Existing query setup
    #/
      components/ui/            # shadcn/ui primitives (managed by CLI)
      hooks/                    # shadcn hooks (use-mobile.ts)
  backend/
    src/
      domain/                   # Internal types (Model.Class) + re-exports from shared
      ...
```

## 4. Domain Types

All domain types are imported from `@laundry-app/shared` — the frontend does **not** maintain its own type definitions. See `docs/shared/phase_01.md` for the full type inventory.

```typescript
// Import types from the shared package
import type {
  LoginInput,
  AuthenticatedUser,
  AuthResponse,
} from '@laundry-app/shared'

import type {
  OrderStatus,
  PaymentStatus,
  OrderWithDetails,
  UpdateOrderStatusInput,
} from '@laundry-app/shared'

import type {
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@laundry-app/shared'
```

> **Note**: The frontend uses `import type` for pure type inference. The `effect` package is a dependency for Schema type resolution, but no Effect runtime code runs on the frontend. The API client remains plain `fetch` + TanStack Query.

## 5. References

- Backend API: See `docs/API_TEST.md` for all endpoint curl examples and response shapes
- Backend Architecture: See `docs/ADR_BACKEND.md` for backend decisions and database schema
- Product Requirements: See `docs/PRD.md` for full feature specifications

