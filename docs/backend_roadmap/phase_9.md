## Phase 9: API Routes - Orders

**Goal**: Implement order management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

**Status**: ✅ COMPLETE

### Tasks

#### Task 9.1: Define Order Schemas

- [x] Create `src/domain/Order.ts`:

  ```typescript
  import { Schema } from "effect";

  export class CreateOrderItemRequest extends Schema.Class<CreateOrderItemRequest>(
    "CreateOrderItemRequest"
  )({
    serviceId: Schema.String.pipe(Schema.uuid()),
    quantity: Schema.Number.pipe(Schema.positive()),
  }) {}

  export class CreateOrderRequest extends Schema.Class<CreateOrderRequest>(
    "CreateOrderRequest"
  )({
    customerId: Schema.String.pipe(Schema.uuid()),
    items: Schema.Array(CreateOrderItemRequest).pipe(Schema.minItems(1)),
    paymentStatus: Schema.optional(Schema.Literal("paid", "unpaid")),
  }) {}

  export class UpdateOrderStatusRequest extends Schema.Class<UpdateOrderStatusRequest>(
    "UpdateOrderStatusRequest"
  )({
    status: Schema.Literal("received", "in_progress", "ready", "delivered"),
  }) {}

  export class UpdatePaymentStatusRequest extends Schema.Class<UpdatePaymentStatusRequest>(
    "UpdatePaymentStatusRequest"
  )({
    paymentStatus: Schema.Literal("paid", "unpaid"),
  }) {}

  export class OrderResponse extends Schema.Class<OrderResponse>("OrderResponse")({
    id: Schema.String,
    order_number: Schema.String,
    customer_id: Schema.String,
    status: Schema.Literal("received", "in_progress", "ready", "delivered"),
    payment_status: Schema.Literal("paid", "unpaid"),
    total_price: Schema.Number,
    created_by: Schema.String,
    created_at: Schema.Date,
    updated_at: Schema.Date,
  }) {}

  export class OrderItemResponse extends Schema.Class<OrderItemResponse>(
    "OrderItemResponse"
  )({
    id: Schema.String,
    service_id: Schema.String,
    quantity: Schema.Number,
    price_at_order: Schema.Number,
    subtotal: Schema.Number,
  }) {}

  export class OrderWithItemsResponse extends Schema.Class<OrderWithItemsResponse>(
    "OrderWithItemsResponse"
  )({
    id: Schema.String,
    order_number: Schema.String,
    customer_id: Schema.String,
    status: Schema.Literal("received", "in_progress", "ready", "delivered"),
    payment_status: Schema.Literal("paid", "unpaid"),
    total_price: Schema.Number,
    created_by: Schema.String,
    created_at: Schema.Date,
    updated_at: Schema.Date,
    items: Schema.Array(OrderItemResponse),
  }) {}
  ```

#### Task 9.2: Implement Order Routes

- [x] Create `src/api/orders/orderRoutes.ts`
- [x] POST `/api/orders` - Create new order
- [x] GET `/api/orders` - List orders (with filters)
- [x] GET `/api/orders/:id` - Get order details with items
- [x] PUT `/api/orders/:id/status` - Update order status
- [x] PUT `/api/orders/:id/payment` - Update payment status

#### Task 9.3: Implement Order Creation Logic

- [x] Parse and validate request body
- [x] Extract current user from context (created_by)
- [x] Call OrderService.create()
- [x] Handle validation errors (empty items, invalid service IDs)
- [x] Return created order

#### Task 9.4: Implement Order Status Updates

- [x] Validate status transitions
- [x] Update order status
- [x] Return updated order

#### Task 9.5: Implement Order Retrieval

- [x] List orders with pagination
- [x] Filter by customer_id, status, payment_status
- [x] Get order details including order items

#### Task 9.6: Write Integration Tests

- [x] Test order creation with valid data
- [x] Test order creation with empty items (should fail)
- [x] Test order creation with invalid service ID
- [x] Test price calculation accuracy
- [x] Test order status transitions
- [x] Test invalid status transitions
- [x] Test payment status updates
- [x] Test order retrieval with filters

### Verification Steps

- [x] POST `/api/orders` creates order with correct total price
- [x] POST `/api/orders` validates order items
- [x] GET `/api/orders` returns orders with filters
- [x] GET `/api/orders/:id` returns order with items
- [x] PUT `/api/orders/:id/status` validates transitions
- [x] PUT `/api/orders/:id/payment` updates payment status
- [x] Order number is unique and well-formatted
- [x] All order tests pass (39 tests passing)

### Implementation Notes

**Files Created/Modified:**
- `backend/src/domain/Order.ts` - Domain models with schemas (Order, OrderItem, CreateOrderInput, UpdateOrderStatusInput, UpdatePaymentStatusInput, OrderResponse, OrderWithItemsResponse, etc.)
- `backend/src/api/OrderApi.ts` - HTTP API contract defining all endpoints
- `backend/src/handlers/OrderHandlers.ts` - Request handlers for order operations
- `backend/src/usecase/order/OrderService.ts` - Business logic for order creation, updates, and retrieval
- `backend/src/repositories/OrderRepository.ts` - Data access layer for orders
- `backend/src/repositories/OrderItemRepository.ts` - Data access layer for order items
- `backend/test/api/orders/orderRoutes.test.ts` - Comprehensive integration tests (39 tests)

**Key Features Implemented:**
- Order creation with automatic order number generation (format: ORD-YYYYMMDD-XXX)
- Service price validation and total calculation
- Status workflow validation (received → in_progress → ready → delivered)
- Payment status management (paid/unpaid)
- Order filtering by customer_id, status, and payment_status
- Full order details with items and service information
- Authentication middleware protection on all order endpoints
- Comprehensive error handling with domain-specific error types

### Deliverable

✅ Working order management API with creation, retrieval, and status updates
