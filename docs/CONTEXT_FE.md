# Frontend Context

Quick reference for the frontend project. Read this before exploring — covers structure, patterns, and conventions.

---

## Directory Structure

```
frontend/src/
├── api/                        # React Query hooks + API call functions
├── components/
│   ├── features/               # Feature-scoped components (domain-specific)
│   │   └── orders/             # Order table columns, etc.
│   ├── layout/                 # App-level layout pieces
│   ├── shared/                 # Reusable presentational components
│   └── ui/                     # shadcn UI primitives (do not edit directly)
├── domain/                     # Effect TypeScript error types
├── hooks/                      # Custom React hooks
├── integrations/
│   └── tanstack-query/         # QueryClient provider + devtools
├── lib/                        # Utilities, constants, API client
├── routes/                     # TanStack Router file-based routes
├── router.tsx                  # Router factory
├── start.ts                    # TanStack Start entry + auth middleware
├── routeTree.gen.ts            # Auto-generated, do not edit
└── styles.css                  # Tailwind v4 global styles + CSS variables
```

---

## Routes

File-based routing via TanStack Router. `routeTree.gen.ts` is auto-generated on save.

| Route File | Path | Notes |
|---|---|---|
| `__root.tsx` | — | HTML shell, providers, Sonner toaster |
| `login.tsx` | `/login` | Auth form; redirects to `/` if already logged in |
| `_dashboard.tsx` | — | Layout: sidebar + header + `<Outlet />` |
| `_dashboard/index.tsx` | `/` | Active orders table |
| `_dashboard/history.tsx` | `/history` | Stub |
| `_dashboard/analytics.tsx` | `/analytics` | Admin-only, guarded by `beforeLoad` |
| `_dashboard/staff.tsx` | `/staff` | Admin-only, guarded by `beforeLoad` |

**Route protection**: Admin pages use `beforeLoad` to read user from QueryClient cache and redirect to `/` if not admin.

---

## API & Data Fetching

### API Client (`src/lib/api-client.ts`)
- Base URL: `http://localhost:3000`
- All calls include `credentials: 'include'` (httpOnly cookies)
- 401 → automatic `POST /api/auth/refresh`, retry original request; redirects to `/login` if refresh fails
- Response validation via `Schema.decodeUnknown()` (Effect TypeScript)
- Convenience: `api.get()`, `api.post()`, `api.put()`, `api.del()`
- Custom `ApiError` class with `status` and `code`

### React Query Modules (`src/api/`)
Pattern: query key factory + `use*` hooks + raw fetch functions

**`src/api/auth.ts`**
- `authKeys` — `{ all, user }`
- `useCurrentUser()` — staleTime: Infinity
- `useLogin()` — mutation, toast + navigate on success
- `useLogout()` — mutation, cache clear

**`src/api/orders.ts`**
- `orderKeys` — `{ all, list(filters?), active(), detail(id) }`
- `useActiveOrders()` — filters to received/in_progress, refetchInterval: 30s
- `useUpdateOrderStatus()` — mutation + invalidate + toast
- `useUpdatePaymentStatus()` — mutation + invalidate + toast

---

## Components

### `src/components/ui/` (shadcn — do not modify)
All built with Radix UI + CVA. Use `className` prop to override via `cn()`.

| File | Component |
|---|---|
| `badge.tsx` | `Badge` — pill badge, `variant` prop + `className` overrides |
| `button.tsx` | `Button` — variants: default, destructive, outline, secondary, ghost, link |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `input.tsx` | `Input` |
| `label.tsx` | `Label` |
| `select.tsx` | `Select` (Radix) |
| `dropdown-menu.tsx` | `DropdownMenu` and sub-components (Radix) |
| `alert-dialog.tsx` | `AlertDialog` and sub-components (Radix) |
| `sheet.tsx` | `Sheet` side drawer (Radix Dialog) |
| `sidebar.tsx` | `Sidebar` complex context-based component |
| `skeleton.tsx` | `Skeleton` loading placeholder |
| `sonner.tsx` | `Toaster` wrapper for Sonner |
| `avatar.tsx` | `Avatar` (Radix) |
| `tooltip.tsx` | `Tooltip` (Radix) |
| `separator.tsx` | `Separator` |
| `pagination.tsx` | `Pagination` |
| `radio-group.tsx` | `RadioGroup` (Radix) |
| `calendar.tsx` | `Calendar` (react-day-picker) |
| `chart.tsx` | Chart primitives (Recharts) |

**shadcn override pattern:**
```tsx
// Suppress default border, apply semantic colors
<Badge className="bg-blue-100 text-blue-700 border-transparent">...</Badge>
```

### `src/components/shared/`

| File | Purpose |
|---|---|
| `data-table.tsx` | Generic `<DataTable<TData, TValue>>` using TanStack Table; handles skeleton loading (5 rows) |
| `empty-state.tsx` | Empty state UI (icon, title, description, optional action button) |
| `error-state.tsx` | Error state UI with retry button |

### `src/components/layout/`

| File | Purpose |
|---|---|
| `app-sidebar.tsx` | Main nav sidebar; filters menu items by user role |
| `breadcrumb-nav.tsx` | Top header showing current route label |
| `nav-user.tsx` | User profile dropdown in sidebar footer |

### `src/components/features/`

| File | Purpose |
|---|---|
| `orders/order-table-columns.tsx` | `getOrderColumns(callbacks)` → `ColumnDef<OrderWithDetails>[]` |

---

## Key Patterns

### Table Columns
```ts
export function getOrderColumns(callbacks: OrderColumnCallbacks): ColumnDef<OrderWithDetails>[] {
  return [
    { accessorKey: 'field', header: 'Label', cell: ({ row }) => ... },
    // ...
  ]
}
```
Callbacks (`onAdvanceStatus`, `onTogglePayment`) are passed in from the page component and wired to mutations.

### Page State Pattern (`_dashboard/index.tsx`)
```tsx
if (isLoading)  return <DataTable columns={skeletonCols} data={[]} />
if (isError)    return <ErrorState onRetry={refetch} />
if (!data.length) return <EmptyState />
return <DataTable columns={cols} data={data} />
```

### Auth
- Tokens stored in httpOnly cookies — frontend never reads them directly
- Server middleware (`src/lib/auth-middleware.ts`) validates access token by calling `/api/auth/me`
- Uses Effect `NetworkError`, `AccessTokenInvalidError`, `RefreshTokenFailedError`
- Client-side refresh handled transparently in `apiClient`

### Routing Guards (admin pages)
```ts
beforeLoad: async ({ context }) => {
  const user = context.queryClient.getQueryData(authKeys.user)
  if (user?.role !== 'admin') throw redirect({ to: '/' })
}
```

---

## Lib Utilities

**`src/lib/constants.ts`**
```ts
ORDER_STATUS_LABELS: Record<OrderStatus, string>   // 'received' → 'Received'
PAYMENT_STATUS_LABELS: Record<PaymentStatus, string>
ORDER_STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>>  // state machine
formatCurrency(amount: number): string   // "Rp 10.000"
formatDate(dt: DateTime.Utc): string     // ID locale with time
```

**`src/lib/utils.ts`**
```ts
cn(...inputs: ClassValue[]): string  // clsx + tailwind-merge
```

**`src/hooks/use-mobile.ts`**
```ts
useIsMobile(): boolean  // true if viewport < 768px
```

**`src/domain/auth-error.ts`**
```ts
class NetworkError extends Data.TaggedError('NetworkError')
class AccessTokenInvalidError extends Data.TaggedError('AccessTokenInvalidError')
class RefreshTokenFailedError extends Data.TaggedError('RefreshTokenFailedError')
```

---

## Config

| File | Key settings |
|---|---|
| `vite.config.ts` | Port 3100, plugins: TanStack Start + Router + Tailwind v4 |
| `tsconfig.json` | ES2022, strict, path alias `@/*` → `./src/*` |
| `src/styles.css` | Tailwind v4, Oklch color vars, light/dark theme, sidebar vars |

### Key Dependencies
- React 19.2
- TanStack Router + React Query + React Table + React Start
- Effect TypeScript (`effect`, `@effect/schema`)
- Tailwind CSS v4
- Lucide React (icons)
- Sonner (toasts)
- Recharts (charts)
- date-fns

---

## Shared Types (from `@laundry-app/shared`)
The frontend imports domain types from the shared package:
- `OrderWithDetails` — full order row with customer info
- `OrderStatus` — `'received' | 'in_progress' | 'ready' | 'delivered'`
- `PaymentStatus` — `'paid' | 'unpaid'`
