# Test Plan: Order API Routes (Phase 9)

**Date**: 2026-02-15  
**Task**: Order API Routes Implementation  
**Scope**: Backend Order Management Endpoints

## 1. Overview

This test plan covers the Order API Routes implementation following the completion of Phase 9 (API Routes - Orders). The implementation adds five HTTP endpoints for order management:

- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders with filters
- `GET /api/orders/:id` - Get order details with items
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/payment` - Update payment status

## 2. Code Changes Summary

### 2.1 Modified Files

| File | Changes |
|------|---------|
| `backend/src/domain/Order.ts` | Added HTTP Response schemas: `OrderResponse`, `OrderItemResponse`, `OrderWithItemsResponse` |
| `backend/src/domain/http/HttpErrors.ts` | Added order error types: `OrderNotFound`, `InvalidOrderStatus`, `EmptyOrderError` |
| `backend/src/repositories/OrderRepository.ts` | Added `customer_id` filter support in `findWithFilters` and `findWithDetails` |
| `docs/backend_roadmap/phase_9.md` | Updated from `Schema.Struct` to `Schema.Class` pattern |

### 2.2 New Files

| File | Purpose |
|------|---------|
| `backend/src/api/OrderApi.ts` | HTTP API schema definition using `@effect/platform` HttpApi |
| `backend/src/handlers/OrderHandlers.ts` | Handler implementations for all order endpoints |
| `backend/test/api/orders/orderRoutes.test.ts` | Comprehensive test suite (1,143 lines) |

### 2.3 Router Integration

- `backend/src/http/Router.ts` - Added `OrderApiLive` layer composition with all dependencies

## 3. Test Coverage Analysis

### 3.1 Current Test Coverage

The test file `backend/test/api/orders/orderRoutes.test.ts` includes:

| Endpoint | Test Count | Coverage |
|----------|-----------|----------|
| POST /api/orders | 12 tests | Create with single/multiple items, payment status, validation errors, auth |
| GET /api/orders | 10 tests | No filters, customer_id filter, status filter, payment_status filter, combined filters |
| GET /api/orders/:id | 7 tests | Success retrieval, 404 not found, auth cases |
| PUT /api/orders/:id/status | 11 tests | Status transitions (received→in_progress→ready→delivered), invalid transitions, auth |
| PUT /api/orders/:id/payment | 8 tests | Payment updates (paid↔unpaid), 404 cases, auth |
| Integration Tests | 5 tests | Complete lifecycle, status transitions, price calculation, concurrent operations |

**Total: 53 test cases**

### 3.2 Test Categories

#### A. Success Cases (26 tests)
- Order creation with valid data
- Multiple items and quantities
- Custom payment status
- Filter operations (single and combined)
- Order retrieval with items
- Status transitions (forward only)
- Payment status updates
- Complete order lifecycle flows

#### B. Validation Error Cases (8 tests)
- Empty items array (422)
- Invalid service ID (404)
- Invalid status value (400)
- Invalid payment_status value (400)
- Order not found (404)
- Invalid status transitions (422)

#### C. Authentication Cases (12 tests)
- Staff access to all endpoints
- Admin access to all endpoints
- Unauthorized access handling

#### D. Edge Cases (7 tests)
- Price calculation accuracy
- Concurrent order creation
- Multiple filters combined
- Empty result sets

## 4. Test Execution Plan

### 4.1 Pre-requisites

```bash
# Ensure database is migrated
bun run migrate

# Install dependencies
bun install
```

### 4.2 Test Commands

```bash
# Run all order tests
bun test backend/test/api/orders/orderRoutes.test.ts

# Run with coverage
bun test --coverage backend/test/api/orders/orderRoutes.test.ts

# Run in watch mode during development
bun test --watch backend/test/api/orders/orderRoutes.test.ts
```

### 4.3 Test Data Requirements

**Mock Data Setup** (handled in beforeEach):
- Test services: Washing (15,000/kg), Ironing (8,000/set)
- Test orders: 4 orders with different statuses and payment states
- Test order items: 2 items per order
- Mock order number generator: Returns `ORD-20240215-001`

### 4.4 Environment Configuration

Tests use mocked repositories to avoid database dependencies:
- `createMockOrderRepo` - In-memory order storage
- `createMockOrderItemRepo` - In-memory order item storage
- `createMockServiceRepo` - In-memory service storage
- Mock layers are provided via Effect's dependency injection

## 5. Verification Checklist

### 5.1 API Contract Verification

| Endpoint | Request | Response | Status Codes |
|----------|---------|----------|--------------|
| POST /api/orders | `CreateOrderInput` | `OrderResponse` | 201, 400, 401, 422 |
| GET /api/orders | Query params | `OrderWithDetails[]` | 200, 400, 401 |
| GET /api/orders/:id | Path param | `OrderWithItemsResponse` | 200, 400, 401, 404 |
| PUT /api/orders/:id/status | `UpdateOrderStatusInput` | `OrderResponse` | 200, 400, 401, 404, 422 |
| PUT /api/orders/:id/payment | `UpdatePaymentStatusInput` | `OrderResponse` | 200, 400, 401, 404 |

### 5.2 Business Rules Verification

- [ ] Order number format: `ORD-{YYYYMMDD}-{SEQUENCE}`
- [ ] Default payment_status: `unpaid`
- [ ] Initial order status: `received`
- [ ] Price calculation: `quantity × price_at_order` per item
- [ ] Status transitions:
  - `received` → `in_progress` ✓
  - `in_progress` → `ready` ✓
  - `ready` → `delivered` ✓
  - Any other transition → Error
- [ ] All endpoints require authentication (AuthMiddleware)

### 5.3 Data Integrity Verification

- [ ] `created_by` populated from CurrentUser context
- [ ] `price_at_order` captured at creation time
- [ ] `subtotal` calculated correctly per item
- [ ] `total_price` sum of all item subtotals
- [ ] `updated_at` modified on status/payment changes

## 6. Known Limitations & Future Tests

### 6.1 Not Covered (Future Enhancement)

1. **Pagination**: `limit` and `offset` parameters are accepted but not tested
2. **Date Range Filters**: `start_date` and `end_date` filters exist but not tested
3. **SQL Injection**: Repository uses parameterized queries (safe), but no explicit tests
4. **Concurrent Updates**: No tests for race conditions on status updates
5. **Order Number Uniqueness**: Mock returns fixed value, no collision tests

### 6.2 Integration Test Gaps

1. **End-to-End HTTP**: Tests use service layer directly, no full HTTP stack tests
2. **Database Integration**: Uses mocks, no real PostgreSQL tests
3. **Middleware Integration**: Auth middleware mocked, no JWT validation tests

## 7. Success Criteria

### 7.1 All Tests Pass

```bash
$ bun test backend/test/api/orders/orderRoutes.test.ts

Test Files  1 passed (1)
     Tests  53 passed (53)
  Duration  X.XXs
```

### 7.2 Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Statements | >90% | TBD |
| Branches | >85% | TBD |
| Functions | >95% | TBD |
| Lines | >90% | TBD |

### 7.3 Manual Verification

Run the following curl commands to verify API works:

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "items": [{"service_id": "550e8400-e29b-41d4-a716-446655440001", "quantity": 2}],
    "payment_status": "unpaid"
  }'

# 3. List orders with filter
curl "http://localhost:3000/api/orders?status=received&payment_status=unpaid" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get order by ID
curl http://localhost:3000/api/orders/{order-id} \
  -H "Authorization: Bearer $TOKEN"

# 5. Update status
curl -X PUT http://localhost:3000/api/orders/{order-id}/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 6. Update payment
curl -X PUT http://localhost:3000/api/orders/{order-id}/payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payment_status": "paid"}'
```

## 8. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock repositories don't match real DB behavior | High | Add integration tests with test database |
| Status transition validation bypassed | High | Add specific transition tests in OrderStatusValidator |
| Price calculation rounding issues | Medium | Test with decimal quantities and edge values |
| Concurrent order number collision | Low | Integration test with real OrderNumberGenerator |

## 9. Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | - | 2026-02-15 | ✅ Implemented |
| QA Reviewer | - | - | ⏳ Pending |
| Tech Lead | - | - | ⏳ Pending |

## 10. References

- [Phase 9 Roadmap](../backend_roadmap/phase_9.md)
- [Context Documentation](../CONTEXT.md)
- [Order Domain Model](../../backend/src/domain/Order.ts)
- [Order Handlers](../../backend/src/handlers/OrderHandlers.ts)
- [Order API Schema](../../backend/src/api/OrderApi.ts)
- [Order Tests](../../backend/test/api/orders/orderRoutes.test.ts)
