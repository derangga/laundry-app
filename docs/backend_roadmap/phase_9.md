## Phase 9: API Routes - Orders

**Goal**: Implement order management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 9.1: Define Order Schemas

- [ ] Create `src/domain/Order.ts`:

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

- [ ] Create `src/api/orders/orderRoutes.ts`
- [ ] POST `/api/orders` - Create new order
- [ ] GET `/api/orders` - List orders (with filters)
- [ ] GET `/api/orders/:id` - Get order details with items
- [ ] PUT `/api/orders/:id/status` - Update order status
- [ ] PUT `/api/orders/:id/payment` - Update payment status

#### Task 9.3: Implement Order Creation Logic

- [ ] Parse and validate request body
- [ ] Extract current user from context (created_by)
- [ ] Call OrderService.create()
- [ ] Handle validation errors (empty items, invalid service IDs)
- [ ] Return created order

#### Task 9.4: Implement Order Status Updates

- [ ] Validate status transitions
- [ ] Update order status
- [ ] Return updated order

#### Task 9.5: Implement Order Retrieval

- [ ] List orders with pagination
- [ ] Filter by customer_id, status, payment_status
- [ ] Get order details including order items

#### Task 9.6: Write Integration Tests

- [ ] Test order creation with valid data
- [ ] Test order creation with empty items (should fail)
- [ ] Test order creation with invalid service ID
- [ ] Test price calculation accuracy
- [ ] Test order status transitions
- [ ] Test invalid status transitions
- [ ] Test payment status updates
- [ ] Test order retrieval with filters

### Verification Steps

- [ ] POST `/api/orders` creates order with correct total price
- [ ] POST `/api/orders` validates order items
- [ ] GET `/api/orders` returns orders with filters
- [ ] GET `/api/orders/:id` returns order with items
- [ ] PUT `/api/orders/:id/status` validates transitions
- [ ] PUT `/api/orders/:id/payment` updates payment status
- [ ] Order number is unique and well-formatted
- [ ] All order tests pass

### Deliverable

Working order management API with creation, retrieval, and status updates
