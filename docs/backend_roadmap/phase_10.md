## Phase 10: Analytics & Reporting

**Goal**: Implement analytics and receipt generation

**Prerequisites**: Phase 2 (Repositories), Phase 5 (HTTP Server) complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 10.1: Create Analytics Repository Methods

- [ ] Add analytics queries to OrderRepository or create AnalyticsRepository
- [ ] Implement weekly revenue query:
  ```sql
  SELECT
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) as order_count,
    SUM(total_price) as total_revenue
  FROM orders
  WHERE created_at >= $1 AND created_at < $2
    AND (payment_status = $3 OR $3 = 'all')
  GROUP BY week_start
  ORDER BY week_start
  ```

#### Task 10.2: Define Analytics Schemas

- [ ] Create `src/api/analytics/schemas.ts`:

  ```typescript
  import { Schema } from "@effect/schema";

  export const WeeklyAnalyticsQuery = Schema.Struct({
    startDate: Schema.String, // ISO date string
    status: Schema.optional(Schema.Literal("paid", "unpaid", "all")),
  });

  export const WeeklyAnalyticsResponse = Schema.Struct({
    weeks: Schema.Array(
      Schema.Struct({
        week_start: Schema.Date,
        order_count: Schema.Number,
        total_revenue: Schema.Number,
      }),
    ),
  });
  ```

#### Task 10.3: Implement Analytics Route

- [ ] Create `src/api/analytics/analyticsRoutes.ts`
- [ ] GET `/api/analytics/weekly?startDate={date}&status={paid|unpaid|all}`
- [ ] Protect with `requireAdmin` guard
- [ ] Query database for weekly aggregations
- [ ] Return formatted analytics data

#### Task 10.4: Create Receipt Generation Use Case

- [ ] Create `src/application/receipt/GenerateReceiptUseCase.ts`
- [ ] Fetch order with items
- [ ] Fetch customer details
- [ ] Format receipt data

#### Task 10.5: Implement Receipt Route

- [ ] Create `src/api/receipts/receiptRoutes.ts`
- [ ] GET `/api/receipts/:orderId` - Generate receipt
- [ ] Include order details, customer info, items, total
- [ ] Format for printing or display

#### Task 10.6: Write Tests

- [ ] Test weekly analytics query
- [ ] Test analytics filtering (paid/unpaid/all)
- [ ] Test receipt generation
- [ ] Test authorization (admin only for analytics)

### Verification Steps

- [ ] GET `/api/analytics/weekly` returns correct aggregations
- [ ] Analytics filters work correctly
- [ ] GET `/api/receipts/:orderId` returns complete receipt
- [ ] Analytics endpoint requires admin role
- [ ] All analytics tests pass

### Deliverable

Working analytics and reporting API with weekly revenue analytics and receipt generation
