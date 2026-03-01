# Phase 3: Home Dashboard — Active Orders Table

**Status**: ✅ Done

**Goal**: Build the home dashboard page showing a table of orders with status "received" and "in_progress" using TanStack Table and TanStack Query. Include status/payment badges and action buttons for updating status and payment.

**Prerequisites**: Phase 2 complete (dashboard layout, sidebar, route structure), shared package (`docs/shared/phase_01.md`)

---

## Tasks

### 3.1 Create Constants and Helpers

**Create `frontend/src/lib/constants.ts`:**
```typescript
import type { OrderStatus, PaymentStatus } from '@laundry-app/shared'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received', in_progress: 'In Progress',
  ready: 'Ready', delivered: 'Delivered',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid', unpaid: 'Unpaid',
}

export const ORDER_STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'in_progress', in_progress: 'ready', ready: 'delivered',
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
```

### 3.2 Create Orders API Module

**Create `frontend/src/api/orders.ts`:**

Types (imported from `@laundry-app/shared`):
```typescript
import type {
  OrderWithDetails,
  OrderResponse,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
} from '@laundry-app/shared'
```

Query keys:
```typescript
export const orderKeys = {
  all: ['orders'] as const,
  list: (filters?: OrderFilters) => ['orders', 'list', filters] as const,
  active: () => ['orders', 'active'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}
```

Functions:
- `fetchOrders(): Promise<OrderWithDetails[]>` — `GET /api/orders` (returns flat array)
- `updateOrderStatusFn(id: string, input: UpdateOrderStatusInput): Promise<OrderResponse>` — `PUT /api/orders/${id}/status`
- `updatePaymentStatusFn(id: string, input: UpdatePaymentStatusInput): Promise<OrderResponse>` — `PUT /api/orders/${id}/payment`

Hooks:
- `useActiveOrders()` — fetches all orders via `fetchOrders()`, then **client-side filters** to only `received` and `in_progress` statuses. `refetchInterval: 30000` (30s auto-refresh)
- `useUpdateOrderStatus()` — mutation, on success: invalidate `orderKeys.all`, toast success
- `useUpdatePaymentStatus()` — mutation, on success: invalidate `orderKeys.all`, toast success

### 3.3 Create Status Badge Component

**Create `frontend/src/components/shared/status-badge.tsx`:**
- Props: `status: OrderStatus` (from `@laundry-app/shared`)
- Color mapping:
  - `received` → blue (`bg-blue-100 text-blue-700`)
  - `in_progress` → amber (`bg-amber-100 text-amber-700`)
  - `ready` → purple (`bg-purple-100 text-purple-700`)
  - `delivered` → green (`bg-green-100 text-green-700`)
- Renders a small rounded pill with the status label

### 3.4 Create Payment Badge Component

**Create `frontend/src/components/shared/payment-badge.tsx`:**
- Props: `status: PaymentStatus` (from `@laundry-app/shared`)
- `paid` → green pill
- `unpaid` → red pill

### 3.5 Create Empty State and Error State Components

**Create `frontend/src/components/shared/empty-state.tsx`:**
- Props: `icon?: ReactNode`, `title: string`, `description?: string`, `action?: ReactNode`
- Renders a centered card-like area with the icon, title, description, and optional CTA button
- Used by every page when a query returns zero results

**Create `frontend/src/components/shared/error-state.tsx`:**
- Props: `title?: string` (default "Something went wrong"), `description?: string`, `onRetry?: () => void`
- Renders a centered error message with a "Try again" button that calls `onRetry` (typically `query.refetch()`)
- Used by every page when a query fails

### 3.6 Create Data Table Wrapper

**Create `frontend/src/components/shared/data-table.tsx`:**
- Generic component: `DataTable<TData, TValue>`
- Props: `columns: ColumnDef<TData, TValue>[]`, `data: TData[]`, `isLoading?: boolean`
- Uses TanStack Table's `useReactTable` with `getCoreRowModel`
- Renders an HTML `<table>` styled with Tailwind (shadcn table pattern)
- Loading state: renders skeleton rows (using shadcn `Skeleton`)
- Does NOT handle empty/error states internally — the parent page is responsible for showing `<EmptyState />` or `<ErrorState />` before rendering `<DataTable />`

### 3.7 Create Order Table Column Definitions

**Create `frontend/src/components/features/orders/order-table-columns.tsx`:**

Columns:
| Column | Content |
|--------|---------|
| Order # | `order_number` (bold, monospace) |
| Customer | `customer_name` primary, `customer_phone` secondary (muted, smaller) |
| Status | `<StatusBadge status={row.status} />` |
| Payment | `<PaymentBadge status={row.payment_status} />` |
| Total | `formatCurrency(row.total_price)` |
| Date | `formatDate(row.created_at)` |
| Actions | Dropdown menu: "Advance Status" + "Toggle Payment" |

The column definitions accept callback props or use mutations directly. "Advance Status" uses `ORDER_STATUS_NEXT[currentStatus]` to determine the next status.

### 3.8 Build Home Dashboard Page

**Replace placeholder in `frontend/src/routes/_dashboard/index.tsx`:**
- Page heading: "Dashboard" with count of active orders
- Uses `useActiveOrders()` to fetch data
- **Must handle all UI states explicitly:**
  - `isLoading` → render skeleton table rows via DataTable's `isLoading` prop
  - `isError` → render `<ErrorState description={error.message} onRetry={refetch} />`
  - `data.length === 0` → render `<EmptyState icon={<Inbox />} title="No active orders" description="Orders with status received or in progress will appear here." />`
  - Has data → render `<DataTable columns={orderColumns} data={activeOrders} />`
- Confirmation dialog (shadcn `AlertDialog`) before status changes
- Toast notifications (Sonner) on successful status/payment updates via mutation hooks
- Toast notifications (Sonner) on mutation errors

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/constants.ts` |
| Create | `src/api/orders.ts` |
| Create | `src/components/shared/empty-state.tsx` |
| Create | `src/components/shared/error-state.tsx` |
| Create | `src/components/shared/status-badge.tsx` |
| Create | `src/components/shared/payment-badge.tsx` |
| Create | `src/components/shared/data-table.tsx` |
| Create | `src/components/features/orders/order-table-columns.tsx` |
| Modify | `src/routes/_dashboard/index.tsx` |

## Acceptance Criteria

- [x] Home page shows a table of orders with status "received" and "in_progress" only
- [x] Table columns: Order #, Customer, Status, Payment, Total, Date, Actions
- [x] Status badges are color-coded (blue=received, amber=in_progress, purple=ready, green=delivered)
- [x] Payment badges show paid (green) / unpaid (red)
- [x] Currency formatted as "Rp 45,000"
- [x] Date formatted in Indonesian locale
- [x] Clicking "Advance Status" opens confirmation dialog then updates via API
- [x] Clicking "Toggle Payment" updates payment status via API
- [x] Table auto-refreshes every 30 seconds
- [x] Loading state shows skeleton rows
- [x] Empty state shows "No active orders" when no orders match
- [x] Toast notifications on successful status/payment updates
- [x] Toast notifications on API errors

## Dependencies

- **Shared package**: `@laundry-app/shared` must be set up (`docs/shared/phase_01.md`)
- **Phase 1**: API client, token management
- **Phase 2**: Dashboard layout, route structure
