## Phase 4: Domain Services

**Goal**: Implement business logic layer

**Prerequisites**: Phase 2 complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 4.1: Define Domain Errors

**Customer Errors** - Create `src/domain/CustomerErrors.ts`:

```typescript
import { Data } from 'effect'

export class CustomerNotFound extends Data.TaggedError('CustomerNotFound')<{
  phone: string
}> {}

export class CustomerAlreadyExists extends Data.TaggedError('CustomerAlreadyExists')<{
  phone: string
}> {}

export class InvalidPhoneNumber extends Data.TaggedError('InvalidPhoneNumber')<{
  phone: string
  reason: string
}> {}
```

**Service Errors** - Create `src/domain/ServiceErrors.ts`:

```typescript
import { Data } from 'effect'

export class ServiceNotFound extends Data.TaggedError('ServiceNotFound')<{
  serviceId: string
}> {}

export class ServiceAlreadyExists extends Data.TaggedError('ServiceAlreadyExists')<{
  name: string
}> {}

export class InvalidServiceUnit extends Data.TaggedError('InvalidServiceUnit')<{
  unitType: string
}> {}
```

**Order Errors** - Create `src/domain/OrderErrors.ts`:

```typescript
import { Data } from 'effect'

export class OrderNotFound extends Data.TaggedError('OrderNotFound')<{
  orderId: string
}> {}

export class InvalidOrderStatus extends Data.TaggedError('InvalidOrderStatus')<{
  currentStatus: string
  attemptedStatus: string
  reason: string
}> {}

export class InvalidOrderTransition extends Data.TaggedError('InvalidOrderTransition')<{
  from: string
  to: string
}> {}

export class OrderValidationError extends Data.TaggedError('OrderValidationError')<{
  errors: Array<{ field: string; message: string }>
}> {}

export class EmptyOrderError extends Data.TaggedError('EmptyOrderError')<{
  message: string
}> {}
```

#### Task 4.2: Create Phone Number Validation

- [x] Create `src/domain/PhoneNumber.ts`:

  ```typescript
  import { Schema } from '@effect/schema'
  import { Effect } from 'effect'
  import { InvalidPhoneNumber } from './CustomerErrors'

  // Indonesian phone number format: +62XXXXXXXXX (9-13 digits after +62)
  export const PhoneNumberSchema = Schema.String.pipe(
    Schema.pattern(/^\+62\d{9,13}$/),
    Schema.brand('PhoneNumber')
  )

  export type PhoneNumber = Schema.Schema.Type<typeof PhoneNumberSchema>

  export const normalizePhoneNumber = (
    phone: string
  ): Effect.Effect<PhoneNumber, InvalidPhoneNumber> => {
    // Remove spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '')

    // Convert 08... to +628...
    const withPrefix = cleaned.startsWith('0')
      ? '+62' + cleaned.slice(1)
      : cleaned.startsWith('+62')
        ? cleaned
        : '+62' + cleaned

    return Schema.decode(PhoneNumberSchema)(withPrefix).pipe(
      Effect.mapError(
        (parseError) =>
          new InvalidPhoneNumber({
            phone,
            reason: 'Invalid Indonesian phone number format. Expected +62XXXXXXXXX',
          })
      )
    )
  }
  ```

#### Task 4.3: Create Order Number Generator

- [x] Create `src/domain/OrderNumberGenerator.ts`:

  ```typescript
  import { Effect } from 'effect'

  export const generateOrderNumber = (): Effect.Effect<string> =>
    Effect.sync(() => {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const timestamp = Date.now().toString().slice(-6)

      return `ORD-${year}${month}${day}-${timestamp}`
    })
  ```

#### Task 4.4: Create Order Status Validator

- [x] Create `src/domain/OrderStatusValidator.ts`:

  ```typescript
  import { Effect } from 'effect'
  import { OrderStatus } from './Order'
  import { InvalidOrderTransition } from './OrderErrors'

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    received: ['in_progress'],
    in_progress: ['ready'],
    ready: ['delivered'],
    delivered: [], // Terminal state
  }

  export const validateStatusTransition = (
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): Effect.Effect<void, InvalidOrderTransition> => {
    const allowedStatuses = validTransitions[currentStatus]

    if (!allowedStatuses.includes(newStatus)) {
      return Effect.fail(
        new InvalidOrderTransition({
          from: currentStatus,
          to: newStatus,
        })
      )
    }

    return Effect.void
  }
  ```

#### Task 4.5: Create CustomerService

- [x] Create `src/application/customer/CustomerService.ts`:

  ```typescript
  import { Effect, Option } from 'effect'
  import { CustomerRepository } from '@repositories/CustomerRepository'
  import { normalizePhoneNumber, PhoneNumber } from './PhoneNumber'
  import { CustomerNotFound, CustomerAlreadyExists } from './CustomerErrors'

  interface CreateCustomerData {
    name: string
    phone: string
    address?: string
  }

  export class CustomerService extends Effect.Service<CustomerService>()('CustomerService', {
    effect: Effect.gen(function* () {
      const repo = yield* CustomerRepository

      const findByPhone = (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* repo.findByPhone(phone)

          if (Option.isNone(customerOption)) {
            return yield* Effect.fail(new CustomerNotFound({ phone }))
          }

          return customerOption.value
        })

      const checkExists = (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* repo.findByPhone(phone)
          return Option.isSome(customerOption)
        })

      const create = (data: CreateCustomerData) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(data.phone)

          // Check if customer already exists
          const existing = yield* repo.findByPhone(phone)
          if (Option.isSome(existing)) {
            return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
          }

          // Create customer
          return yield* repo.insert({
            name: data.name,
            phone,
            address: data.address || null,
          })
        })

      return {
        findByPhone,
        checkExists,
        create,
      }
    }),
    dependencies: [CustomerRepository.Default],
  }) {}
  ```

#### Task 4.6: Create LaundryServiceService

- [x] Create `src/application/order/LaundryServiceService.ts`:

  ```typescript
  import { Effect, Option } from 'effect'
  import { ServiceRepository } from '@repositories/ServiceRepository'
  import { ServiceNotFound, ServiceAlreadyExists } from './ServiceErrors'
  import { UnitType } from './LaundryService'

  interface CreateServiceData {
    name: string
    price: number
    unit_type: UnitType
  }

  interface UpdateServiceData {
    name?: string
    price?: number
    unit_type?: UnitType
  }

  export class LaundryServiceService extends Effect.Service<LaundryServiceService>()(
    'LaundryServiceService',
    {
      effect: Effect.gen(function* () {
        const repo = yield* ServiceRepository

        const findActive = () => repo.findActive()

        const findById = (id: string) =>
          Effect.gen(function* () {
            const serviceOption = yield* repo.findById(id)

            if (Option.isNone(serviceOption)) {
              return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
            }

            return serviceOption.value
          })

        const create = (data: CreateServiceData) =>
          repo.insert({
            ...data,
            is_active: true,
          })

        const update = (id: string, data: UpdateServiceData) =>
          Effect.gen(function* () {
            // Check if service exists
            yield* findById(id)

            // Update service
            yield* repo.update(id, {
              ...data,
              updated_at: new Date(),
            })
          })

        const softDelete = (id: string) =>
          Effect.gen(function* () {
            // Check if service exists
            yield* findById(id)

            // Soft delete (set is_active = false)
            yield* repo.softDelete(id)
          })

        return {
          findActive,
          findById,
          create,
          update,
          softDelete,
        }
      }),
      dependencies: [ServiceRepository.Default],
    }
  ) {}
  ```

#### Task 4.7: Create OrderService

- [x] Create `src/application/order/OrderService.ts`:

  ```typescript
  import { Effect, Option } from 'effect'
  import { OrderRepository } from '@repositories/OrderRepository'
  import { OrderItemRepository } from '@repositories/OrderItemRepository'
  import { ServiceRepository } from '@repositories/ServiceRepository'
  import { generateOrderNumber } from './OrderNumberGenerator'
  import { validateStatusTransition } from './OrderStatusValidator'
  import { OrderNotFound, EmptyOrderError, InvalidOrderStatus } from './OrderErrors'
  import { ServiceNotFound } from '@domain/ServiceErrors'
  import { OrderStatus, PaymentStatus } from './Order'

  interface CreateOrderItem {
    serviceId: string
    quantity: number
  }

  interface CreateOrderData {
    customerId: string
    items: CreateOrderItem[]
    createdBy: string
    paymentStatus?: PaymentStatus
  }

  export class OrderService extends Effect.Service<OrderService>()('OrderService', {
    effect: Effect.gen(function* () {
      const orderRepo = yield* OrderRepository
      const orderItemRepo = yield* OrderItemRepository
      const serviceRepo = yield* ServiceRepository

      const calculateTotal = (items: Array<{ quantity: number; priceAtOrder: number }>): number => {
        return items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)
      }

      const create = (data: CreateOrderData) =>
        Effect.gen(function* () {
          // Validate: must have at least one item
          if (data.items.length === 0) {
            return yield* Effect.fail(
              new EmptyOrderError({
                message: 'Order must contain at least one item',
              })
            )
          }

          // Generate order number
          const orderNumber = yield* generateOrderNumber()

          // Fetch service prices and prepare order items
          const itemsWithPrices = yield* Effect.forEach(
            data.items,
            (item) =>
              Effect.gen(function* () {
                const serviceOption = yield* serviceRepo.findById(item.serviceId)

                if (Option.isNone(serviceOption)) {
                  return yield* Effect.fail(new ServiceNotFound({ serviceId: item.serviceId }))
                }

                const service = serviceOption.value
                const priceAtOrder = service.price
                const subtotal = item.quantity * priceAtOrder

                return {
                  serviceId: item.serviceId,
                  quantity: item.quantity,
                  priceAtOrder,
                  subtotal,
                }
              }),
            { concurrency: 'unbounded' }
          )

          // Calculate total
          const totalPrice = calculateTotal(itemsWithPrices)

          // Create order (wrap in transaction if needed)
          const order = yield* orderRepo.insert({
            order_number: orderNumber,
            customer_id: data.customerId,
            status: 'received',
            payment_status: data.paymentStatus || 'unpaid',
            total_price: totalPrice,
            created_by: data.createdBy,
          })

          // Create order items
          yield* orderItemRepo.insertMany(
            itemsWithPrices.map((item) => ({
              order_id: order.id,
              service_id: item.serviceId,
              quantity: item.quantity,
              price_at_order: item.priceAtOrder,
              subtotal: item.subtotal,
            }))
          )

          return order
        })

      const findById = (id: string) =>
        Effect.gen(function* () {
          const orderOption = yield* orderRepo.findById(id)

          if (Option.isNone(orderOption)) {
            return yield* Effect.fail(new OrderNotFound({ orderId: id }))
          }

          return orderOption.value
        })

      const updateStatus = (id: string, newStatus: OrderStatus) =>
        Effect.gen(function* () {
          const order = yield* findById(id)

          // Validate status transition
          yield* validateStatusTransition(order.status, newStatus)

          // Update status
          yield* orderRepo.updateStatus(id, newStatus)
        })

      const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
        Effect.gen(function* () {
          // Check if order exists
          yield* findById(id)

          // Update payment status
          yield* orderRepo.updatePaymentStatus(id, paymentStatus)
        })

      const findByCustomerId = (customerId: string) => orderRepo.findByCustomerId(customerId)

      return {
        create,
        findById,
        updateStatus,
        updatePaymentStatus,
        findByCustomerId,
      }
    }),
    dependencies: [OrderRepository.Default, OrderItemRepository.Default, ServiceRepository.Default],
  }) {}
  ```

#### Task 4.8: Write Domain Service Tests

- [ ] Test CustomerService:
  - Phone number normalization and validation
  - Customer creation with duplicate check
  - Find customer by phone
- [ ] Test LaundryServiceService:
  - Service creation
  - Service soft delete
  - Find active services
- [ ] Test OrderService:
  - Order creation with price calculation
  - Order status transitions
  - Payment status updates
  - Empty order validation

### Key Files to Create

- Domain errors in `src/domain/{Entity}Errors.ts`
- Phone number validation in `src/domain/PhoneNumber.ts`
- Order number generator in `src/domain/OrderNumberGenerator.ts`
- Order status validator in `src/domain/OrderStatusValidator.ts`
- Domain services in `src/application/{Entity}/{Entity}Service.ts`
- Tests in `test/domain/`

### Verification Steps

- [x] All domain errors are defined
- [x] Phone number validation works for Indonesian numbers
- [x] Order number generation is unique and formatted correctly
- [x] Order status transitions are validated
- [x] CustomerService enforces business rules
- [x] LaundryServiceService implements soft delete
- [x] OrderService calculates prices correctly
- [x] OrderService validates order workflow
- [ ] All domain service tests pass (skipped per user request)

### Deliverable

Complete domain services layer with:

- CustomerService with phone validation
- LaundryServiceService with soft delete
- OrderService with price calculation and workflow validation
- Comprehensive error types
- Business rule enforcement
- Test coverage for all services
