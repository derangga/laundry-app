# Phase 5: Analytics Page (Admin Only)

**Goal**: Build the admin-only analytics page showing weekly revenue and order count charts using Recharts, plus dashboard summary stat cards.

**Prerequisites**: Phase 1 complete (API client, auth), Phase 2 complete (admin route guard, dashboard layout), shared package (`docs/shared/phase_01.md`)

---

## Tasks

### 5.1 Create Analytics API Module

**Create `frontend/src/api/analytics.ts`:**

Types (imported from `@laundry-app/shared`):
```typescript
import type {
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@laundry-app/shared'
```

Local type for query params (not in shared — frontend-only concern):
```typescript
export interface WeeklyParams {
  payment_status?: 'paid' | 'unpaid' | 'all'
  range?: string            // 'last_4_weeks' | 'last_8_weeks' | 'last_12_weeks'
  start_date?: string
  end_date?: string
}
```

Query keys:
```typescript
export const analyticsKeys = {
  all: ['analytics'] as const,
  weekly: (params?: WeeklyParams) => ['analytics', 'weekly', params] as const,
  dashboard: () => ['analytics', 'dashboard'] as const,
}
```

Functions:
- `fetchWeeklyAnalytics(params?: WeeklyParams): Promise<WeeklyAnalyticsResponse>` — `GET /api/analytics/weekly` with query string params
- `fetchDashboardStats(): Promise<DashboardStatsResponse>` — `GET /api/analytics/dashboard`

Hooks:
- `useWeeklyAnalytics(params?: WeeklyParams)` — `useQuery` with `analyticsKeys.weekly(params)`
- `useDashboardStats()` — `useQuery` with `analyticsKeys.dashboard()`

### 5.2 Create Stats Cards Component

**Create `frontend/src/components/features/analytics/stats-cards.tsx`:**
- Grid of 4 shadcn `Card` components (2x2 on desktop, 1 col on mobile)
- Cards:
  | Label | Value | Icon |
  |-------|-------|------|
  | Today's Orders | `todays_orders` | `ShoppingBag` |
  | Pending Payments | `pending_payments` | `Clock` |
  | Weekly Revenue | `formatCurrency(weekly_revenue)` | `DollarSign` |
  | Total Customers | `total_customers` | `Users` |
- Loading state: 4 skeleton cards

### 5.3 Create Revenue Chart Component

**Create `frontend/src/components/features/analytics/revenue-chart.tsx`:**
- Uses Recharts `BarChart` or `AreaChart` inside shadcn `Chart` wrapper (`#/components/ui/chart`)
- X-axis: `week_start` dates (formatted as "Feb 3", "Feb 10", etc.)
- Y-axis: `total_revenue` (formatted as currency)
- Tooltip: shows exact revenue value on hover
- Responsive container (`ResponsiveContainer`)
- Uses chart color variables from CSS (`--chart-1`)

### 5.4 Create Order Count Chart Component

**Create `frontend/src/components/features/analytics/order-chart.tsx`:**
- Uses Recharts `LineChart` or `BarChart`
- X-axis: `week_start` dates
- Y-axis: `order_count`
- Different color from revenue chart (`--chart-2`)
- Tooltip with exact count on hover
- Responsive container

### 5.5 Build Analytics Page

**Replace placeholder in `frontend/src/routes/_dashboard/analytics.tsx`:**
- `beforeLoad`: admin role check (redirect staff to `/`)
- Page heading: "Analytics"
- Range selector: buttons or select for "Last 4 weeks", "Last 8 weeks", "Last 12 weeks"
- Optional payment filter: "All", "Paid", "Unpaid"
- Layout:
  - `<StatsCards />` at the top (full width)
  - `<RevenueChart />` and `<OrderChart />` side by side (or stacked on smaller screens)
- Uses `useDashboardStats()` and `useWeeklyAnalytics(params)` hooks
- **Must handle all UI states per section:**
  - Stats cards: `isLoading` → 4 skeleton cards; `isError` → `<ErrorState onRetry={refetch} />`
  - Charts: `isLoading` → skeleton chart area; `isError` → `<ErrorState onRetry={refetch} />`; `weeks.length === 0` → `<EmptyState title="No data for selected period" />`
- Mutation/fetch errors shown via Sonner toasts

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/api/analytics.ts` |
| Create | `src/components/features/analytics/stats-cards.tsx` |
| Create | `src/components/features/analytics/revenue-chart.tsx` |
| Create | `src/components/features/analytics/order-chart.tsx` |
| Modify | `src/routes/_dashboard/analytics.tsx` (replace placeholder) |

## Acceptance Criteria

- [ ] Analytics page is only accessible to admin users
- [ ] Staff users redirected to `/` when accessing `/analytics`
- [ ] Stats cards show: today's orders, pending payments, weekly revenue, total customers
- [ ] Revenue chart displays weekly revenue as bar/area chart
- [ ] Order count chart displays weekly orders as line/bar chart
- [ ] Charts are responsive and resize with container
- [ ] Tooltips show exact values on hover
- [ ] Range selector filters chart data (last 4/8/12 weeks)
- [ ] Payment filter works (all/paid/unpaid)
- [ ] Loading skeletons display while data is fetching
- [ ] Error state displays toast if API calls fail

## Dependencies

- **Shared package**: `@laundry-app/shared` must be set up (`docs/shared/phase_01.md`)
- **Phase 1**: API client, token management
- **Phase 2**: Dashboard layout, admin route guard pattern
- `lib/constants.ts` from Phase 3 for `formatCurrency`
