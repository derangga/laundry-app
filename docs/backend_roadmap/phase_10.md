## Phase 10: Analytics & Receipt Generation

**Goal**: Implement analytics dashboard API (weekly revenue/order charts, quick stats) and receipt data endpoint, aligned with PRD FR-6 and FR-7.

**Prerequisites**: Phase 8 (Laundry Services), Phase 9 (Order Management) complete

**Complexity**: Medium-High

---

### Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/analytics/weekly` | GET | `AuthAdminMiddleware` | Weekly revenue + order count with filters |
| `/api/analytics/dashboard` | GET | `AuthAdminMiddleware` | Quick stats (today's orders, pending payments, weekly revenue, total customers) |
| `/api/receipts/:orderId` | GET | `AuthMiddleware` | Receipt data for printing |

---

### New Files (9 files)

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/Analytics.ts` | `WeeklyDataPoint`, `WeeklyAnalyticsResponse`, `DashboardStatsResponse`, filter schemas |
| Domain | `src/domain/Receipt.ts` | `ReceiptItem`, `ReceiptResponse` schemas |
| Repository | `src/repositories/AnalyticsRepository.ts` | SQL aggregation queries (weekly grouping, dashboard counts) |
| Use case | `src/usecase/analytics/AnalyticsService.ts` | Date range computation, zero-fill logic, dashboard assembly |
| Use case | `src/usecase/receipt/ReceiptService.ts` | Receipt data assembly (joins order + items + customer + staff) |
| API | `src/api/AnalyticsApi.ts` | `AnalyticsGroup` with `AuthAdminMiddleware` |
| API | `src/api/ReceiptApi.ts` | `ReceiptGroup` with `AuthMiddleware` |
| Handlers | `src/handlers/AnalyticsHandlers.ts` | Query param parsing, service calls |
| Handlers | `src/handlers/ReceiptHandlers.ts` | Path param parsing, service call |

### Modified Files (2 files)

| File | Change |
|------|--------|
| `src/api/AppApi.ts` | Add `AnalyticsGroup`, `ReceiptGroup` to `AppApi` |
| `src/http/Router.ts` | Add new handlers, use cases, repository to layer composition |

---

### Key Design Decisions

1. **Single weekly endpoint** returns both `total_revenue` AND `order_count` per week — one SQL query yields both `COUNT(*)` and `SUM(total_price)`.
2. **Zero-fill at app level**, not SQL `generate_series` — simpler, testable, max ~104 weeks for a 2-year range.
3. **Payment filter `'all'` handled at app level** — the handler translates `'all'` to `Option.none()` (no WHERE clause), avoiding fragile `$3 = 'all'` SQL patterns.
4. **Dashboard stats**: 4 parallel simple queries via `Effect.all({ concurrency: 4 })`.
5. **Receipt reuses existing repository methods**: `OrderItemRepository.findByOrderIdWithService()` (has `service_name`, `unit_type`, `price_at_order`), `UserRepository.findBasicInfo()` (staff name), `CustomerRepository.findById()`.
6. **Business header hardcoded** for MVP (`"Laundry Service"`), configurable later.
7. **Follows existing project patterns exactly**: `HttpApiGroup.make()` + `HttpApiEndpoint`, `Effect.Service`, query params via `HttpServerRequest` URL parsing, `Schema.decodeUnknownOption()` for enum validation.

---

### Tasks

#### Task 10.1: Define Analytics Domain Schemas

- [ ] Create `src/domain/Analytics.ts`
- [ ] Define filter schema for payment status (`'paid' | 'unpaid' | 'all'`)
- [ ] Define `WeeklyDataPoint` response schema
- [ ] Define `WeeklyAnalyticsResponse` wrapper
- [ ] Define `DashboardStatsResponse` for quick stats

```typescript
import { Schema } from 'effect'
import { DecimalNumber } from './common/DecimalNumber.js'
import { DateTimeUtcString } from './common/DateTimeUtcString.js'

// Filter enum — 'all' means no payment_status WHERE clause
export const AnalyticsPaymentFilter = Schema.Literal('paid', 'unpaid', 'all')
export type AnalyticsPaymentFilter = typeof AnalyticsPaymentFilter.Type

// Single week data point returned by the weekly endpoint
export class WeeklyDataPoint extends Schema.Class<WeeklyDataPoint>('WeeklyDataPoint')({
  week_start: Schema.String, // ISO date string e.g. "2026-02-02"
  total_revenue: Schema.Number,
  order_count: Schema.Number,
}) {}

// Response for GET /api/analytics/weekly
export class WeeklyAnalyticsResponse extends Schema.Class<WeeklyAnalyticsResponse>(
  'WeeklyAnalyticsResponse'
)({
  weeks: Schema.Array(WeeklyDataPoint),
  start_date: Schema.String,
  end_date: Schema.String,
  payment_filter: AnalyticsPaymentFilter,
}) {}

// Response for GET /api/analytics/dashboard
export class DashboardStatsResponse extends Schema.Class<DashboardStatsResponse>(
  'DashboardStatsResponse'
)({
  todays_orders: Schema.Number,
  pending_payments: Schema.Number,
  weekly_revenue: Schema.Number,
  total_customers: Schema.Number,
}) {}
```

---

#### Task 10.2: Define Receipt Domain Schema

- [ ] Create `src/domain/Receipt.ts`
- [ ] Define `ReceiptItem` with service details (name, unit_type, quantity, price_at_order, subtotal)
- [ ] Define `ReceiptResponse` with all PRD FR-7.1 fields

```typescript
import { Schema } from 'effect'
import { DecimalNumber } from './common/DecimalNumber.js'
import { DateTimeUtcString } from './common/DateTimeUtcString.js'
import { UnitType } from './LaundryService.js'
import { OrderStatus, PaymentStatus } from './Order.js'

export class ReceiptItem extends Schema.Class<ReceiptItem>('ReceiptItem')({
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
}) {}

export class ReceiptResponse extends Schema.Class<ReceiptResponse>('ReceiptResponse')({
  // Business header
  business_name: Schema.String,
  business_address: Schema.NullOr(Schema.String),
  business_phone: Schema.NullOr(Schema.String),
  // Order info
  order_number: Schema.String,
  order_date: DateTimeUtcString,
  order_status: OrderStatus,
  // Customer info
  customer_name: Schema.String,
  customer_phone: Schema.String,
  // Items
  items: Schema.Array(ReceiptItem),
  // Pricing
  total_price: Schema.Number,
  // Payment
  payment_status: PaymentStatus,
  // Footer
  staff_name: Schema.String,
}) {}
```

---

#### Task 10.3: Create AnalyticsRepository

- [ ] Create `src/repositories/AnalyticsRepository.ts`
- [ ] Implement `getWeeklyAggregation(startDate, endDate, paymentStatus?)` — returns raw weekly rows
- [ ] Implement `getTodaysOrderCount()` — `COUNT(*)` where `created_at >= today`
- [ ] Implement `getPendingPaymentCount()` — `COUNT(*)` where `payment_status = 'unpaid'`
- [ ] Implement `getWeeklyRevenue()` — `SUM(total_price)` where `payment_status = 'paid'` and `created_at >= 7 days ago`
- [ ] Implement `getTotalCustomerCount()` — `COUNT(*)` from customers table
- [ ] All queries use explicit column lists (no `SELECT *`)

```typescript
import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { PaymentStatus } from '../domain/Order'

interface WeeklyRow {
  week_start: Date
  total_revenue: string // PostgreSQL DECIMAL comes as string
  order_count: string   // PostgreSQL BIGINT comes as string
}

export class AnalyticsRepository extends Effect.Service<AnalyticsRepository>()(
  'AnalyticsRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const getWeeklyAggregation = (
        startDate: Date,
        endDate: Date,
        paymentStatus: Option.Option<PaymentStatus>
      ): Effect.Effect<readonly WeeklyRow[], SqlError.SqlError> => {
        // Payment filter handled at app level — if Option.none(), no WHERE clause for payment_status
        if (Option.isSome(paymentStatus)) {
          return sql<WeeklyRow>`
            SELECT
              DATE_TRUNC('week', created_at)::date AS week_start,
              COALESCE(SUM(total_price), 0) AS total_revenue,
              COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= ${startDate}
              AND created_at < ${endDate}
              AND payment_status = ${paymentStatus.value}
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week_start ASC
          `
        }

        return sql<WeeklyRow>`
          SELECT
            DATE_TRUNC('week', created_at)::date AS week_start,
            COALESCE(SUM(total_price), 0) AS total_revenue,
            COUNT(*) AS order_count
          FROM orders
          WHERE created_at >= ${startDate}
            AND created_at < ${endDate}
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY week_start ASC
        `
      }

      const getTodaysOrderCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE created_at >= CURRENT_DATE
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      const getPendingPaymentCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE payment_status = 'unpaid'
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      const getWeeklyRevenue = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ total: string }>`
          SELECT COALESCE(SUM(total_price), 0) AS total
          FROM orders
          WHERE payment_status = 'paid'
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        `.pipe(Effect.map((rows) => parseFloat(rows[0]?.total ?? '0')))

      const getTotalCustomerCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM customers
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      return {
        getWeeklyAggregation,
        getTodaysOrderCount,
        getPendingPaymentCount,
        getWeeklyRevenue,
        getTotalCustomerCount,
      } as const
    }),
  }
) {}
```

---

#### Task 10.4: Create AnalyticsService

- [ ] Create `src/usecase/analytics/AnalyticsService.ts`
- [ ] Implement `getWeeklyAnalytics(startDate, endDate, paymentFilter)`:
  - Compute `startDate`/`endDate` from predefined range or custom input
  - If `paymentFilter === 'all'`, pass `Option.none()` to repository
  - Fetch raw weekly data from repository
  - **Zero-fill**: iterate week by week from `startDate` to `endDate`, inserting `{ total_revenue: 0, order_count: 0 }` for missing weeks
  - Return `WeeklyAnalyticsResponse`
- [ ] Implement `getDashboardStats()`:
  - Run 4 parallel queries using `Effect.all({ concurrency: 4 })`
  - Return `DashboardStatsResponse`
- [ ] Predefined range helper:
  - `'last_4_weeks'` → today - 4 weeks
  - `'last_12_weeks'` → today - 12 weeks (default)
  - `'last_6_months'` → today - 6 months
  - `'this_year'` → January 1 of current year
  - `'last_year'` → January 1 - December 31 of previous year

```typescript
import { Effect, Option } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import {
  AnalyticsPaymentFilter,
  WeeklyDataPoint,
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@domain/Analytics'
import { PaymentStatus } from '@domain/Order'

export class AnalyticsService extends Effect.Service<AnalyticsService>()(
  'AnalyticsService',
  {
    effect: Effect.gen(function* () {
      const analyticsRepo = yield* AnalyticsRepository

      /**
       * Zero-fill: ensure every Monday between startDate and endDate has a data point.
       * Weeks with no orders show as { total_revenue: 0, order_count: 0 }.
       */
      const zeroFillWeeks = (
        rows: readonly { week_start: Date; total_revenue: string; order_count: string }[],
        startDate: Date,
        endDate: Date
      ): WeeklyDataPoint[] => {
        // Build a map of week_start ISO string → row data
        const dataMap = new Map<string, { total_revenue: number; order_count: number }>()
        for (const row of rows) {
          const key = row.week_start.toISOString().slice(0, 10)
          dataMap.set(key, {
            total_revenue: parseFloat(String(row.total_revenue)),
            order_count: parseInt(String(row.order_count), 10),
          })
        }

        // Find the first Monday on or before startDate
        const result: WeeklyDataPoint[] = []
        const current = new Date(startDate)
        // Align to Monday (day 1)
        const day = current.getDay()
        const diff = day === 0 ? -6 : 1 - day
        current.setDate(current.getDate() + diff)

        while (current < endDate) {
          const key = current.toISOString().slice(0, 10)
          const data = dataMap.get(key)
          result.push(
            WeeklyDataPoint.make({
              week_start: key,
              total_revenue: data?.total_revenue ?? 0,
              order_count: data?.order_count ?? 0,
            })
          )
          current.setDate(current.getDate() + 7)
        }

        return result
      }

      const getWeeklyAnalytics = (
        startDate: Date,
        endDate: Date,
        paymentFilter: AnalyticsPaymentFilter
      ) =>
        Effect.gen(function* () {
          // Translate 'all' → Option.none(), 'paid'/'unpaid' → Option.some(value)
          const paymentStatusOption: Option.Option<PaymentStatus> =
            paymentFilter === 'all'
              ? Option.none()
              : Option.some(paymentFilter as PaymentStatus)

          const rows = yield* analyticsRepo.getWeeklyAggregation(
            startDate,
            endDate,
            paymentStatusOption
          )

          const weeks = zeroFillWeeks(rows, startDate, endDate)

          return WeeklyAnalyticsResponse.make({
            weeks,
            start_date: startDate.toISOString().slice(0, 10),
            end_date: endDate.toISOString().slice(0, 10),
            payment_filter: paymentFilter,
          })
        })

      const getDashboardStats = () =>
        Effect.gen(function* () {
          const [todaysOrders, pendingPayments, weeklyRevenue, totalCustomers] =
            yield* Effect.all(
              [
                analyticsRepo.getTodaysOrderCount(),
                analyticsRepo.getPendingPaymentCount(),
                analyticsRepo.getWeeklyRevenue(),
                analyticsRepo.getTotalCustomerCount(),
              ],
              { concurrency: 4 }
            )

          return DashboardStatsResponse.make({
            todays_orders: todaysOrders,
            pending_payments: pendingPayments,
            weekly_revenue: weeklyRevenue,
            total_customers: totalCustomers,
          })
        })

      return {
        getWeeklyAnalytics,
        getDashboardStats,
      }
    }),
    dependencies: [AnalyticsRepository.Default],
  }
) {}
```

---

#### Task 10.5: Create ReceiptService

- [ ] Create `src/usecase/receipt/ReceiptService.ts`
- [ ] Implement `generateReceipt(orderId)`:
  - Fetch order via `OrderRepository.findById()`
  - Fetch items via `OrderItemRepository.findByOrderIdWithService()` (reuse existing — has `service_name`, `unit_type`, `price_at_order`)
  - Fetch customer via `CustomerRepository.findById()`
  - Fetch staff via `UserRepository.findBasicInfo()` (staff name from `created_by`)
  - Assemble `ReceiptResponse` with hardcoded business header for MVP

```typescript
import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { UserRepository } from '@repositories/UserRepository'
import { ReceiptItem, ReceiptResponse } from '@domain/Receipt'
import { OrderId } from '@domain/Order'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'

export class ReceiptService extends Effect.Service<ReceiptService>()(
  'ReceiptService',
  {
    effect: Effect.gen(function* () {
      const orderRepo = yield* OrderRepository
      const orderItemRepo = yield* OrderItemRepository
      const customerRepo = yield* CustomerRepository
      const userRepo = yield* UserRepository

      const generateReceipt = (orderId: OrderId) =>
        Effect.gen(function* () {
          // 1. Fetch order
          const orderOption = yield* orderRepo.findById(orderId)
          if (Option.isNone(orderOption)) {
            return yield* Effect.fail(
              new OrderNotFoundError({ orderId, message: `Order not found: ${orderId}` })
            )
          }
          const order = orderOption.value

          // 2. Fetch items with service details (reuses existing method)
          const items = yield* orderItemRepo.findByOrderIdWithService(orderId)

          // 3. Fetch customer
          const customerOption = yield* customerRepo.findById(
            order.customer_id as unknown as CustomerId
          )
          const customer = Option.isSome(customerOption)
            ? customerOption.value
            : { name: 'Unknown', phone: '-' }

          // 4. Fetch staff (who created the order)
          const staffOption = yield* userRepo.findBasicInfo(
            order.created_by as unknown as UserId
          )
          const staffName = Option.isSome(staffOption) ? staffOption.value.name : 'Staff'

          // 5. Assemble receipt
          return ReceiptResponse.make({
            // Business header (hardcoded for MVP)
            business_name: 'Laundry Service',
            business_address: null,
            business_phone: null,
            // Order info
            order_number: order.order_number,
            order_date: order.created_at,
            order_status: order.status,
            // Customer
            customer_name: customer.name,
            customer_phone: customer.phone,
            // Items
            items: items.map((item) =>
              ReceiptItem.make({
                service_name: item.service_name,
                unit_type: item.unit_type,
                quantity: item.quantity,
                price_at_order: item.price_at_order,
                subtotal: item.subtotal,
              })
            ),
            // Pricing
            total_price: order.total_price,
            // Payment
            payment_status: order.payment_status,
            // Footer
            staff_name: staffName,
          })
        })

      return { generateReceipt }
    }),
    dependencies: [
      OrderRepository.Default,
      OrderItemRepository.Default,
      CustomerRepository.Default,
      UserRepository.Default,
    ],
  }
) {}
```

**Note**: The receipt uses `price_at_order` from `OrderItemWithService` (historical price at time of order), not the current service price. This ensures receipt accuracy per PRD FR-7.1.

---

#### Task 10.6: Define API Endpoints

- [ ] Create `src/api/AnalyticsApi.ts` with `AnalyticsGroup`
- [ ] Create `src/api/ReceiptApi.ts` with `ReceiptGroup`
- [ ] Analytics endpoints use `AuthAdminMiddleware` (admin only, returns 403 for staff)
- [ ] Receipt endpoint uses `AuthMiddleware` (accessible by both admin and staff)

**`src/api/AnalyticsApi.ts`**:

```typescript
import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { WeeklyAnalyticsResponse, DashboardStatsResponse } from '@domain/Analytics'
import { ValidationError, Forbidden } from '@domain/http/HttpErrors'
import { AuthAdminMiddleware } from 'src/middleware/AuthMiddleware'

export const AnalyticsGroup = HttpApiGroup.make('Analytics')
  .add(
    HttpApiEndpoint.get('weekly', '/api/analytics/weekly')
      .addSuccess(WeeklyAnalyticsResponse)
      .addError(ValidationError)
      .addError(Forbidden)
  )
  .add(
    HttpApiEndpoint.get('dashboard', '/api/analytics/dashboard')
      .addSuccess(DashboardStatsResponse)
      .addError(Forbidden)
  )
  .middlewareEndpoints(AuthAdminMiddleware)
```

**`src/api/ReceiptApi.ts`**:

```typescript
import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { ReceiptResponse } from '@domain/Receipt'
import { OrderNotFound, ValidationError } from '@domain/http/HttpErrors'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ orderId: Schema.String })

export const ReceiptGroup = HttpApiGroup.make('Receipts')
  .add(
    HttpApiEndpoint.get('getReceipt', '/api/receipts/:orderId')
      .setPath(OrderIdParam)
      .addSuccess(ReceiptResponse)
      .addError(OrderNotFound)
      .addError(ValidationError)
  )
  .middlewareEndpoints(AuthMiddleware)
```

---

#### Task 10.7: Implement Analytics Handlers

- [ ] Create `src/handlers/AnalyticsHandlers.ts`
- [ ] Handle `weekly`: parse query params (`start_date`, `end_date`, `payment_status`, `range`), validate with `Schema.decodeUnknownOption()`, call `AnalyticsService.getWeeklyAnalytics()`
- [ ] Handle `dashboard`: call `AnalyticsService.getDashboardStats()`
- [ ] Support predefined ranges via `range` query param: `last_4_weeks`, `last_12_weeks`, `last_6_months`, `this_year`, `last_year`
- [ ] Custom range via `start_date` + `end_date` query params (ISO date strings)
- [ ] Default to `last_12_weeks` if no range or dates provided

```typescript
import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { AppApi } from '@api/AppApi'
import { AnalyticsService } from 'src/usecase/analytics/AnalyticsService'
import { AnalyticsPaymentFilter } from '@domain/Analytics'
import { ValidationError } from '@domain/http/HttpErrors'

/**
 * Compute start/end dates from a predefined range name.
 */
const computeDateRange = (range: string): { start: Date; end: Date } => {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 1) // exclusive end

  switch (range) {
    case 'last_4_weeks': {
      const start = new Date(now)
      start.setDate(start.getDate() - 28)
      return { start, end }
    }
    case 'last_12_weeks': {
      const start = new Date(now)
      start.setDate(start.getDate() - 84)
      return { start, end }
    }
    case 'last_6_months': {
      const start = new Date(now)
      start.setMonth(start.getMonth() - 6)
      return { start, end }
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end }
    }
    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const yearEnd = new Date(now.getFullYear(), 0, 1)
      return { start, end: yearEnd }
    }
    default: {
      // Default: last 12 weeks
      const start = new Date(now)
      start.setDate(start.getDate() - 84)
      return { start, end }
    }
  }
}

export const AnalyticsHandlersLive = HttpApiBuilder.group(AppApi, 'Analytics', (handlers) =>
  handlers
    .handle('weekly', () =>
      Effect.gen(function* () {
        const analyticsService = yield* AnalyticsService
        const request = yield* HttpServerRequest.HttpServerRequest
        const url = new URL(request.url, 'http://localhost')

        // Parse payment_status filter (default: 'all')
        const paymentParam = url.searchParams.get('payment_status')
        let paymentFilter: AnalyticsPaymentFilter = 'all'
        if (paymentParam) {
          const decoded = Schema.decodeUnknownOption(AnalyticsPaymentFilter)(paymentParam)
          if (decoded._tag === 'Some') {
            paymentFilter = decoded.value
          } else {
            return yield* Effect.fail(
              new ValidationError({
                message: `Invalid payment_status value: ${paymentParam}. Must be 'paid', 'unpaid', or 'all'.`,
                field: 'payment_status',
              })
            )
          }
        }

        // Determine date range
        const rangeParam = url.searchParams.get('range')
        const startDateParam = url.searchParams.get('start_date')
        const endDateParam = url.searchParams.get('end_date')

        let startDate: Date
        let endDate: Date

        if (startDateParam && endDateParam) {
          // Custom range
          startDate = new Date(startDateParam)
          endDate = new Date(endDateParam)

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return yield* Effect.fail(
              new ValidationError({
                message: 'Invalid date format. Use ISO date strings (YYYY-MM-DD).',
                field: 'start_date',
              })
            )
          }
          if (startDate >= endDate) {
            return yield* Effect.fail(
              new ValidationError({
                message: 'end_date must be after start_date.',
                field: 'end_date',
              })
            )
          }
        } else {
          // Predefined range (default: last_12_weeks)
          const { start, end } = computeDateRange(rangeParam ?? 'last_12_weeks')
          startDate = start
          endDate = end
        }

        return yield* analyticsService.getWeeklyAnalytics(startDate, endDate, paymentFilter)
      })
    )
    .handle('dashboard', () =>
      Effect.gen(function* () {
        const analyticsService = yield* AnalyticsService
        return yield* analyticsService.getDashboardStats()
      })
    )
)
```

---

#### Task 10.8: Implement Receipt Handler

- [ ] Create `src/handlers/ReceiptHandlers.ts`
- [ ] Handle `getReceipt`: extract `path.orderId`, call `ReceiptService.generateReceipt()`
- [ ] Map domain errors to HTTP errors

```typescript
import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { ReceiptService } from 'src/usecase/receipt/ReceiptService'
import { OrderId } from '@domain/Order'
import { OrderNotFound, ValidationError } from '@domain/http/HttpErrors'

export const ReceiptHandlersLive = HttpApiBuilder.group(AppApi, 'Receipts', (handlers) =>
  handlers.handle('getReceipt', ({ path }) =>
    Effect.gen(function* () {
      const receiptService = yield* ReceiptService

      const receipt = yield* receiptService
        .generateReceipt(OrderId.make(path.orderId))
        .pipe(
          Effect.mapError((error) => {
            if (error._tag === 'OrderNotFoundError') {
              return new OrderNotFound({
                message: error.message,
                orderId: path.orderId,
              })
            }
            return new ValidationError({
              message: error.message || 'Failed to generate receipt',
            })
          })
        )

      return receipt
    })
  )
)
```

---

#### Task 10.9: Wire Up in AppApi and Router

- [ ] Update `src/api/AppApi.ts` — add `.add(AnalyticsGroup).add(ReceiptGroup)`
- [ ] Update `src/http/Router.ts` — add handler layers, service layers, repository layer

**`src/api/AppApi.ts`** (updated):

```typescript
import { HttpApi, OpenApi } from '@effect/platform'
import { AuthGroup } from './AuthApi'
import { CustomerGroup } from './CustomerApi'
import { ServiceGroup } from './ServiceApi'
import { OrderGroup } from './OrderApi'
import { AnalyticsGroup } from './AnalyticsApi'
import { ReceiptGroup } from './ReceiptApi'

export class AppApi extends HttpApi.make('AppApi')
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
  .add(AnalyticsGroup)
  .add(ReceiptGroup)
  .annotateContext(
    OpenApi.annotations({
      title: 'Laundry App API',
      version: '1.0.0',
      description: 'API for laundry management — customers, orders, services, payments',
    })
  ) {}
```

**`src/http/Router.ts`** (additions):

```typescript
// New imports
import { AnalyticsHandlersLive } from '@handlers/AnalyticsHandlers'
import { ReceiptHandlersLive } from '@handlers/ReceiptHandlers'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { AnalyticsService } from 'src/usecase/analytics/AnalyticsService'
import { ReceiptService } from 'src/usecase/receipt/ReceiptService'

// Updated layers
const HandlersLive = Layer.mergeAll(
  AuthHandlersLive,
  CustomerHandlersLive,
  ServiceHandlersLive,
  OrderHandlersLive,
  AnalyticsHandlersLive,   // NEW
  ReceiptHandlersLive       // NEW
)

const UseCasesLive = Layer.mergeAll(
  LoginUseCase.Default,
  RefreshTokenUseCase.Default,
  LogoutUseCase.Default,
  RegisterUserUseCase.Default,
  BootstrapUseCase.Default,
  OrderService.Default,
  CustomerService.Default,
  LaundryServiceService.Default,
  AnalyticsService.Default,  // NEW
  ReceiptService.Default     // NEW
)

const RepositoriesLive = Layer.mergeAll(
  UserRepository.Default,
  RefreshTokenRepository.Default,
  CustomerRepository.Default,
  ServiceRepository.Default,
  OrderRepository.Default,
  OrderItemRepository.Default,
  AnalyticsRepository.Default  // NEW
)
```

---

#### Task 10.10: Write Tests

- [ ] **Unit tests for AnalyticsService**:
  - Zero-fill produces correct number of weeks with `{ total_revenue: 0, order_count: 0 }` for empty weeks
  - Predefined ranges compute correct start/end dates
  - Payment filter `'all'` passes `Option.none()` to repository
  - Dashboard stats assembles 4 parallel queries correctly
- [ ] **Unit tests for ReceiptService**:
  - Receipt contains all required fields per PRD FR-7.1
  - Uses `price_at_order` (not current price) for items
  - Falls back gracefully if staff not found (uses `'Staff'`)
  - Returns `OrderNotFoundError` for non-existent order
- [ ] **Integration tests for Analytics endpoints**:
  - `GET /api/analytics/weekly` returns zero-filled weeks
  - `GET /api/analytics/weekly?payment_status=paid` filters correctly
  - `GET /api/analytics/weekly?range=last_4_weeks` uses predefined range
  - `GET /api/analytics/weekly?start_date=...&end_date=...` uses custom range
  - `GET /api/analytics/dashboard` returns all 4 quick stats
  - Analytics endpoints return 403 for non-admin users
- [ ] **Integration tests for Receipt endpoint**:
  - `GET /api/receipts/:orderId` returns complete receipt
  - Receipt contains business header, order info, customer, items, staff name
  - Receipt accessible by both admin and staff
  - Returns 404 for non-existent order
- [ ] Verify `bun run typecheck` passes
- [ ] Verify `bun run test` passes

---

### Verification Checklist

- [ ] `GET /api/analytics/weekly` returns zero-filled weeks (weeks with no orders show as `{ total_revenue: 0, order_count: 0 }`)
- [ ] Weekly analytics supports payment filters: `paid`, `unpaid`, `all` (default)
- [ ] Weekly analytics supports predefined ranges: `last_4_weeks`, `last_12_weeks` (default), `last_6_months`, `this_year`, `last_year`
- [ ] Weekly analytics supports custom date range: `start_date` + `end_date` params
- [ ] `GET /api/analytics/dashboard` returns all 4 quick stats: `todays_orders`, `pending_payments`, `weekly_revenue`, `total_customers`
- [ ] Analytics endpoints return 403 for non-admin users
- [ ] `GET /api/receipts/:orderId` contains all PRD FR-7.1 fields:
  - Business header (name, address, phone)
  - Order info (receipt number = order number, date, status)
  - Customer info (name, phone)
  - Items with `service_name`, `unit_type`, `quantity`, `price_at_order`, `subtotal`
  - Total price
  - Payment status
  - Staff name (who created the order)
- [ ] Receipt uses `price_at_order` (historical price), not current service price
- [ ] Receipt endpoint accessible by both admin and staff
- [ ] `bun run typecheck` and `bun run test` pass

---

### Deliverable

Working analytics and receipt API:
- Weekly revenue + order count charts with zero-fill, payment filters, and flexible date ranges (predefined + custom)
- Dashboard quick stats for today's orders, pending payments, weekly revenue, and total customers
- Receipt data endpoint with all PRD FR-7.1 fields for printing
