# Phase 4: History Order Page

**Status**: ✅ Done

**Goal**: Build the full order history page with status and payment filters, client-side pagination, and the same table/badge components from Phase 3.

**Prerequisites**: Phase 3 complete (order domain types, orders API, data table, badges, column definitions)

---

## Tasks

### 4.1 Create Order Filters Component

**Create `frontend/src/components/features/orders/order-filters.tsx`:**
- Status filter: shadcn `Select` with options: All, Received, In Progress, Ready, Delivered
- Payment filter: shadcn `Select` with options: All, Paid, Unpaid
- Filters controlled by URL search params (TanStack Router `useSearch` / route search validation)
- Changing a filter updates the URL search params (preserving browser history)
- "Reset" button clears all filters

### 4.2 Add `useOrders` Hook with Filters

**Extend `frontend/src/api/orders.ts`:**
- Add `OrderFilters` type: `{ status?: OrderStatus; payment_status?: PaymentStatus }`
- Add `useOrders(filters?: OrderFilters)` hook:
  - Fetches all orders via `fetchOrders()`
  - Client-side filters by `status` and `payment_status` if provided
  - Query key: `orderKeys.list(filters)`

### 4.3 Add Pagination to Data Table

**Extend `frontend/src/components/shared/data-table.tsx`:**
- Add `getPaginationRowModel()` to the table instance
- Add pagination controls below the table using shadcn `Pagination` (or custom Previous/Next buttons)
- Default page size: 20 rows
- Show "Showing X to Y of Z results" text
- Optional page size selector (10, 20, 50)

### 4.4 Build History Order Page

**Replace placeholder in `frontend/src/routes/_dashboard/history.tsx`:**
- Route search params validation: `{ status?: string; payment_status?: string }`
- Page heading: "Order History"
- `<OrderFilters />` at the top
- `<DataTable>` with all orders (filtered), reusing column definitions from Phase 3
- Pagination controls at the bottom
- Actions (Advance Status, Toggle Payment) work the same as on the dashboard
- **Must handle all UI states explicitly:**
  - `isLoading` → skeleton table rows
  - `isError` → `<ErrorState description={error.message} onRetry={refetch} />`
  - `data.length === 0` → `<EmptyState title="No orders found" description="Try adjusting your filters." />`
  - Has data → render `<DataTable>` with pagination
- Mutation success/errors shown via Sonner toasts

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/features/orders/order-filters.tsx` |
| Modify | `src/api/orders.ts` (add `useOrders`, `OrderFilters`) |
| Modify | `src/components/shared/data-table.tsx` (add pagination) |
| Modify | `src/routes/_dashboard/history.tsx` (replace placeholder) |

## Acceptance Criteria

- [x] History page shows all orders (all statuses)
- [x] Status filter dropdown filters orders by status
- [x] Payment filter dropdown filters orders by payment status
- [x] Filters are reflected in URL search params (`/history?status=received&payment_status=unpaid`)
- [x] Navigating back/forward preserves filter state
- [x] Pagination: previous/next buttons, page size selector
- [x] "Showing X to Y of Z results" text is accurate
- [x] Status and payment update actions work from this page
- [x] Loading and empty states display correctly
- [x] Reuses column definitions, badges, and data-table from Phase 3

## Dependencies

- **Phase 3**: Order domain types, `fetchOrders`, DataTable, StatusBadge, PaymentBadge, column definitions
