## Phase 10: Receipt Generation

**Goal**: Implement receipt data endpoint for printing orders, aligned with PRD FR-7.

**Prerequisites**: Phase 8 (Laundry Services), Phase 9 (Order Management) complete

**Complexity**: Medium

---

### Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/receipts/:orderId` | GET | `AuthMiddleware` | Receipt data for printing |

---

### New Files (5 files)

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/Receipt.ts` | `ReceiptItem`, `ReceiptResponse` schemas |
| Use case | `src/usecase/receipt/ReceiptService.ts` | Receipt data assembly (joins order + items + customer + staff) |
| API | `src/api/ReceiptApi.ts` | `ReceiptGroup` with `AuthMiddleware` |
| Handlers | `src/handlers/ReceiptHandlers.ts` | Path param parsing, service call |

### Modified Files (2 files)

| File | Change |
|------|--------|
| `src/api/AppApi.ts` | Add `ReceiptGroup` to `AppApi` |
| `src/http/Router.ts` | Add new handler, service to layer composition |

---

### Key Design Decisions

1. **Receipt reuses existing repository methods**: `OrderItemRepository.findByOrderIdWithService()` (has `service_name`, `unit_type`, `price_at_order`), `UserRepository.findBasicInfo()` (staff name), `CustomerRepository.findById()`.
2. **Business header hardcoded** for MVP (`"Laundry Service"`), configurable later.
3. **Follows existing project patterns exactly**: `HttpApiGroup.make()` + `HttpApiEndpoint`, `Effect.Service`, query params via `HttpServerRequest` URL parsing, `Schema.decodeUnknownOption()` for enum validation.

---

### Tasks

#### Task 10.1: Define Receipt Domain Schema

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

#### Task 10.2: Create ReceiptService

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

#### Task 10.3: Define Receipt API Endpoint

- [ ] Create `src/api/ReceiptApi.ts` with `ReceiptGroup`
- [ ] Receipt endpoint uses `AuthMiddleware` (accessible by both admin and staff)

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

#### Task 10.4: Implement Receipt Handler

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

#### Task 10.5: Wire Up in AppApi and Router

- [ ] Update `src/api/AppApi.ts` — add `.add(ReceiptGroup)`
- [ ] Update `src/http/Router.ts` — add handler layer, service layer

**`src/api/AppApi.ts`** (updated):

```typescript
import { HttpApi, OpenApi } from '@effect/platform'
import { AuthGroup } from './AuthApi'
import { CustomerGroup } from './CustomerApi'
import { ServiceGroup } from './ServiceApi'
import { OrderGroup } from './OrderApi'
import { ReceiptGroup } from './ReceiptApi'

export class AppApi extends HttpApi.make('AppApi')
  .add(AuthGroup)
  .add(CustomerGroup)
  .add(ServiceGroup)
  .add(OrderGroup)
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
import { ReceiptHandlersLive } from '@handlers/ReceiptHandlers'
import { ReceiptService } from 'src/usecase/receipt/ReceiptService'

// Updated layers
const HandlersLive = Layer.mergeAll(
  AuthHandlersLive,
  CustomerHandlersLive,
  ServiceHandlersLive,
  OrderHandlersLive,
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
  ReceiptService.Default     // NEW
)

const RepositoriesLive = Layer.mergeAll(
  UserRepository.Default,
  RefreshTokenRepository.Default,
  CustomerRepository.Default,
  ServiceRepository.Default,
  OrderRepository.Default,
  OrderItemRepository.Default
)
```

---

#### Task 10.6: Write Tests

- [ ] **Unit tests for ReceiptService**:
  - Receipt contains all required fields per PRD FR-7.1
  - Uses `price_at_order` (not current price) for items
  - Falls back gracefully if staff not found (uses `'Staff'`)
  - Returns `OrderNotFoundError` for non-existent order
- [ ] **Integration tests for Receipt endpoint**:
  - `GET /api/receipts/:orderId` returns complete receipt
  - Receipt contains business header, order info, customer, items, staff name
  - Receipt accessible by both admin and staff
  - Returns 404 for non-existent order
- [ ] Verify `bun run typecheck` passes
- [ ] Verify `bun run test` passes

---

### Verification Checklist

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

Working receipt generation API:
- Receipt data endpoint with all PRD FR-7.1 fields for printing

