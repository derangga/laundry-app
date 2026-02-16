import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { OrderService } from 'src/usecase/order/OrderService'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import {
  Order,
  OrderItem,
  OrderId,
  OrderItemId,
  OrderStatus,
  PaymentStatus,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderWithDetails,
  OrderFilterOptions,
} from '@domain/Order'
import { LaundryService, ServiceId, UnitType } from '@domain/LaundryService'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'
import { CurrentUser } from '@domain/CurrentUser'
import * as OrderNumberGenerator from '@domain/OrderNumberGenerator'
import { validateStatusTransition } from '@domain/OrderStatusValidator'
import {
  OrderNotFound as OrderNotFoundError,
  EmptyOrderError as EmptyOrderDomainError,
} from '@domain/OrderErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'

// ============================================================================
// Test Data Factories
// ============================================================================

const createTestOrder = (id: string, overrides?: Partial<Order>): Order =>
  ({
    id: id as OrderId,
    order_number: `ORD-20240101-${id.slice(-4)}`,
    customer_id: 'customer-1' as CustomerId,
    status: 'received' as OrderStatus,
    payment_status: 'unpaid' as PaymentStatus,
    total_price: 30000,
    created_by: 'user-1' as UserId,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as Order

const createTestOrderItem = (id: string, overrides?: Partial<OrderItem>): OrderItem =>
  ({
    id: id as OrderItemId,
    order_id: 'order-1' as OrderId,
    service_id: 'service-1' as ServiceId,
    quantity: 2,
    price_at_order: 10000,
    subtotal: 20000,
    created_at: new Date(),
    ...overrides,
  }) as OrderItem

const createTestService = (id: string, overrides?: Partial<LaundryService>): LaundryService =>
  ({
    id: id as ServiceId,
    name: 'Test Service',
    price: 10000,
    unit_type: 'kg' as UnitType,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as LaundryService

const createTestOrderWithDetails = (
  id: string,
  overrides?: Partial<OrderWithDetails>
): OrderWithDetails =>
  ({
    id: id as OrderId,
    order_number: `ORD-20240101-${id.slice(-4)}`,
    customer_id: 'customer-1' as CustomerId,
    customer_name: 'John Doe',
    customer_phone: '+628123456789',
    status: 'received' as OrderStatus,
    payment_status: 'unpaid' as PaymentStatus,
    total_price: 30000,
    created_by: 'user-1' as UserId,
    created_by_name: 'Staff User',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as OrderWithDetails

// ============================================================================
// Mock Repository Creators
// ============================================================================

const createMockOrderRepo = (
  orders: Order[],
  ordersWithDetails: OrderWithDetails[] = []
): OrderRepository => {
  const ordersArray = [...orders]
  return {
    findById: vi.fn((id: OrderId) => {
      const order = ordersArray.find((o) => o.id === id)
      // Return a clone to prevent reference sharing issues
      return Effect.succeed(order ? Option.some({ ...order }) : Option.none())
    }),
    findByOrderNumber: vi.fn((_orderNumber: string) => Effect.succeed(Option.none())),
    findByCustomerId: vi.fn((customerId: CustomerId) =>
      Effect.succeed(ordersArray.filter((o) => o.customer_id === customerId))
    ),
    findWithFilters: vi.fn((options?: OrderFilterOptions) => {
      let filtered = [...ordersArray]
      if (options) {
        const customerId = Option.getOrUndefined(options.customer_id)
        if (customerId) {
          filtered = filtered.filter((o) => o.customer_id === customerId)
        }
        const status = Option.getOrUndefined(options.status)
        if (status) {
          filtered = filtered.filter((o) => o.status === status)
        }
        const paymentStatus = Option.getOrUndefined(options.payment_status)
        if (paymentStatus) {
          filtered = filtered.filter((o) => o.payment_status === paymentStatus)
        }
      }
      return Effect.succeed(filtered)
    }),
    findWithDetails: vi.fn((options?: OrderFilterOptions) => {
      let filtered = [...ordersWithDetails]
      if (options) {
        const customerId = Option.getOrUndefined(options.customer_id)
        if (customerId) {
          filtered = filtered.filter((o) => o.customer_id === customerId)
        }
        const status = Option.getOrUndefined(options.status)
        if (status) {
          filtered = filtered.filter((o) => o.status === status)
        }
        const paymentStatus = Option.getOrUndefined(options.payment_status)
        if (paymentStatus) {
          filtered = filtered.filter((o) => o.payment_status === paymentStatus)
        }
      }
      return Effect.succeed(filtered)
    }),
    insert: vi.fn(
      (data: {
        order_number: string
        customer_id: CustomerId
        status: OrderStatus
        payment_status: PaymentStatus
        total_price: number
        created_by: UserId
      }) => {
        const newOrder = createTestOrder(`order-${Date.now()}`, {
          order_number: data.order_number,
          customer_id: data.customer_id,
          status: data.status,
          payment_status: data.payment_status,
          total_price: data.total_price,
          created_by: data.created_by,
        })
        ordersArray.push(newOrder)
        // Return a clone to prevent reference sharing issues
        return Effect.succeed({ ...newOrder })
      }
    ),
    updateStatus: vi.fn((id: OrderId, status: OrderStatus) => {
      const order = ordersArray.find((o) => o.id === id)
      if (order) {
        ;(order as unknown as { status: OrderStatus }).status = status
        ;(order as unknown as { updated_at: Date }).updated_at = new Date()
      }
      return Effect.succeed(void 0)
    }),
    updatePaymentStatus: vi.fn((id: OrderId, paymentStatus: PaymentStatus) => {
      const order = ordersArray.find((o) => o.id === id)
      if (order) {
        ;(order as unknown as { payment_status: PaymentStatus }).payment_status = paymentStatus
        ;(order as unknown as { updated_at: Date }).updated_at = new Date()
      }
      return Effect.succeed(void 0)
    }),
    findSummaries: vi.fn(() => Effect.succeed([])),
    updateTotalPrice: vi.fn(() => Effect.succeed(void 0)),
  } as unknown as OrderRepository
}

const createMockOrderItemRepo = (items: OrderItem[] = []): OrderItemRepository => {
  const itemsArray = [...items]
  return {
    findById: vi.fn((_id: OrderItemId) => Effect.succeed(Option.none())),
    findByOrderId: vi.fn((orderId: OrderId) =>
      Effect.succeed(itemsArray.filter((i) => i.order_id === orderId))
    ),
    findByOrderIdWithService: vi.fn((_orderId: OrderId) => Effect.succeed([])),
    insert: vi.fn((_data: any) => Effect.succeed({} as OrderItem)),
    insertMany: vi.fn((data: any[]) => {
      const newItems = data.map((item, idx) =>
        createTestOrderItem(`item-${Date.now()}-${idx}`, item)
      )
      itemsArray.push(...newItems)
      return Effect.succeed(newItems)
    }),
    deleteByOrderId: vi.fn((_orderId: OrderId) => Effect.succeed(void 0)),
  } as unknown as OrderItemRepository
}

const createMockServiceRepo = (services: LaundryService[]): ServiceRepository => {
  return {
    findById: vi.fn((id: ServiceId) => {
      const service = services.find((s) => s.id === id)
      return Effect.succeed(service ? Option.some(service) : Option.none())
    }),
    findActive: vi.fn(() => Effect.succeed(services.filter((s) => s.is_active))),
    findAll: vi.fn(() => Effect.succeed(services)),
    findActiveServiceInfo: vi.fn(() =>
      Effect.succeed(
        services
          .filter((s) => s.is_active)
          .map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            unit_type: s.unit_type,
          }))
      )
    ),
    insert: vi.fn((_data: any) => Effect.succeed({} as LaundryService)),
    update: vi.fn((_id: any, _data: any) => Effect.succeed(Option.none())),
    softDelete: vi.fn((_id: ServiceId) => Effect.succeed(void 0)),
  } as unknown as ServiceRepository
}

// ============================================================================
// OrderService Builder (Manual Construction with Mocks)
// ============================================================================

const buildOrderService = (
  orderRepo: OrderRepository,
  orderItemRepo: OrderItemRepository,
  serviceRepo: ServiceRepository
): OrderService => {
  const calculateTotal = (items: Array<{ quantity: number; priceAtOrder: number }>): number => {
    return items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)
  }

  const findById = (id: OrderId) =>
    Effect.gen(function* () {
      const orderOption = yield* orderRepo.findById(id)

      if (Option.isNone(orderOption)) {
        return yield* Effect.fail(new OrderNotFoundError({ orderId: id }))
      }

      return orderOption.value
    })

  return {
    create: (data: CreateOrderInput) =>
      Effect.gen(function* () {
        // Validate: must have at least one item
        if (data.items.length === 0) {
          return yield* Effect.fail(
            new EmptyOrderDomainError({
              message: 'Order must contain at least one item',
            })
          )
        }

        // Generate order number
        const orderNumber = yield* OrderNumberGenerator.generateOrderNumber()

        // Fetch service prices and prepare order items
        const itemsWithPrices = yield* Effect.forEach(
          data.items,
          (item) =>
            Effect.gen(function* () {
              const serviceOption = yield* serviceRepo.findById(item.service_id as ServiceId)

              if (Option.isNone(serviceOption)) {
                return yield* Effect.fail(new ServiceNotFound({ serviceId: item.service_id }))
              }

              const service = serviceOption.value
              const priceAtOrder = service.price
              const subtotal = item.quantity * priceAtOrder

              return {
                serviceId: item.service_id,
                quantity: item.quantity,
                priceAtOrder,
                subtotal,
              }
            }),
          { concurrency: 'unbounded' }
        )

        // Calculate total
        const totalPrice = calculateTotal(itemsWithPrices)

        // Create order
        const order = yield* orderRepo.insert(
          Order.insert.make({
            order_number: orderNumber,
            customer_id: CustomerId.make(data.customer_id),
            status: 'received',
            payment_status: data.payment_status || 'unpaid',
            total_price: totalPrice,
            created_by: UserId.make(data.created_by),
          })
        )

        // Create order items
        yield* orderItemRepo.insertMany(
          itemsWithPrices.map((item) => ({
            order_id: order.id,
            service_id: item.serviceId as ServiceId,
            quantity: item.quantity,
            price_at_order: item.priceAtOrder,
            subtotal: item.subtotal,
          }))
        )

        return order
      }),

    findById,

    updateStatus: (id: OrderId, newStatus: OrderStatus) =>
      Effect.gen(function* () {
        const order = yield* findById(id)

        // Validate status transition
        yield* validateStatusTransition(order.status, newStatus)

        // Update status
        yield* orderRepo.updateStatus(id, newStatus)
      }),

    updatePaymentStatus: (id: OrderId, paymentStatus: PaymentStatus) =>
      Effect.gen(function* () {
        // Check if order exists
        yield* findById(id)

        // Update payment status
        yield* orderRepo.updatePaymentStatus(id as OrderId, paymentStatus)
      }),

    findByCustomerId: (id: CustomerId) => orderRepo.findByCustomerId(CustomerId.make(id)),
  } as OrderService
}

// ============================================================================
// Test Helpers
// ============================================================================

const provideCurrentUser = (role: 'staff' | 'admin' = 'staff') =>
  Layer.succeed(CurrentUser, {
    id: UserId.make('test-user-id'),
    email: 'test@example.com',
    role,
  })

const createTestLayer = (
  orders: Order[],
  orderItems: OrderItem[],
  services: LaundryService[],
  ordersWithDetails: OrderWithDetails[] = []
) => {
  const mockOrderRepo = createMockOrderRepo(orders, ordersWithDetails)
  const mockOrderItemRepo = createMockOrderItemRepo(orderItems)
  const mockServiceRepo = createMockServiceRepo(services)
  const orderService = buildOrderService(mockOrderRepo, mockOrderItemRepo, mockServiceRepo)

  return Layer.mergeAll(
    Layer.succeed(OrderRepository, mockOrderRepo),
    Layer.succeed(OrderItemRepository, mockOrderItemRepo),
    Layer.succeed(ServiceRepository, mockServiceRepo),
    Layer.succeed(OrderService, orderService)
  )
}

// ============================================================================
// POST /api/orders Tests
// ============================================================================

describe('POST /api/orders', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]

  beforeEach(() => {
    orders = []
    orderItems = []
    services = [
      createTestService('service-1', { name: 'Washing', price: 15000 }),
      createTestService('service-2', {
        name: 'Ironing',
        price: 8000,
        unit_type: 'set' as UnitType,
      }),
    ]
    // Mock order number generator
    vi.spyOn(OrderNumberGenerator, 'generateOrderNumber').mockReturnValue(
      Effect.succeed('ORD-20240215-001')
    )
  })

  describe('Success Cases', () => {
    it('should create order with valid data and single item', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.customer_id).toBe('customer-1')
      expect(result.status).toBe('received')
      expect(result.payment_status).toBe('unpaid')
      expect(result.total_price).toBe(30000)
      expect(result.created_by).toBe('test-user-id')
    })

    it('should create order with multiple items', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }),
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-2'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.total_price).toBe(38000) // (2 * 15000) + (1 * 8000)
    })

    it('should create order with custom payment_status (paid)', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
            payment_status: 'paid',
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should calculate correct total for multiple quantities of same service', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 3 }),
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.total_price).toBe(75000) // (3 * 15000) + (2 * 15000)
    })

    it('should default payment_status to "unpaid" when not provided', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('unpaid')
    })
  })

  describe('Validation Error Cases', () => {
    it('should fail with 422 when items array is empty', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should fail with 404 when service does not exist', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({
                service_id: ServiceId.make('non-existent-service'),
                quantity: 1,
              }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('Authentication Cases', () => {
    it('should allow staff to create order', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.created_by).toBe('test-user-id')
    })

    it('should allow admin to create order', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.created_by).toBe('test-user-id')
    })
  })
})

// ============================================================================
// GET /api/orders Tests
// ============================================================================

describe('GET /api/orders', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]
  let ordersWithDetails: OrderWithDetails[]

  beforeEach(() => {
    orders = [
      createTestOrder('order-1', {
        customer_id: 'customer-1' as CustomerId,
        status: 'received',
        payment_status: 'unpaid',
      }),
      createTestOrder('order-2', {
        customer_id: 'customer-1' as CustomerId,
        status: 'in_progress',
        payment_status: 'paid',
      }),
      createTestOrder('order-3', {
        customer_id: 'customer-2' as CustomerId,
        status: 'ready',
        payment_status: 'unpaid',
      }),
      createTestOrder('order-4', {
        customer_id: 'customer-2' as CustomerId,
        status: 'delivered',
        payment_status: 'paid',
      }),
    ]
    ordersWithDetails = [
      createTestOrderWithDetails('order-1', {
        customer_id: 'customer-1' as CustomerId,
        status: 'received',
        payment_status: 'unpaid',
      }),
      createTestOrderWithDetails('order-2', {
        customer_id: 'customer-1' as CustomerId,
        status: 'in_progress',
        payment_status: 'paid',
      }),
      createTestOrderWithDetails('order-3', {
        customer_id: 'customer-2' as CustomerId,
        status: 'ready',
        payment_status: 'unpaid',
      }),
      createTestOrderWithDetails('order-4', {
        customer_id: 'customer-2' as CustomerId,
        status: 'delivered',
        payment_status: 'paid',
      }),
    ]
    orderItems = []
    services = []
  })

  describe('Success Cases', () => {
    it('should return all orders when no filters applied', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails()
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(4)
    })

    it('should filter by customer_id', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.some(CustomerId.make('customer-1')),
            status: Option.none(),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(2)
      expect(result.every((o) => o.customer_id === 'customer-1')).toBe(true)
    })

    it('should filter by status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.some('received'),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('received')
    })

    it('should filter by payment_status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.none(),
            payment_status: Option.some('paid'),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(2)
      expect(result.every((o) => o.payment_status === 'paid')).toBe(true)
    })

    it('should filter by multiple query parameters combined', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.some(CustomerId.make('customer-1')),
            status: Option.none(),
            payment_status: Option.some('paid'),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(1)
      expect(result[0]?.customer_id).toBe('customer-1')
      expect(result[0]?.payment_status).toBe('paid')
    })

    it('should return empty array when no orders match filters', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.some(CustomerId.make('non-existent-customer')),
            status: Option.none(),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(0)
    })
  })

  describe('Authentication Cases', () => {
    it('should allow staff to list orders', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails()
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(4)
    })

    it('should allow admin to list orders', async () => {
      const testLayer = createTestLayer(orders, orderItems, services, ordersWithDetails)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findWithDetails()
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(4)
    })
  })
})

// ============================================================================
// GET /api/orders/:id Tests
// ============================================================================

describe('GET /api/orders/:id', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]

  beforeEach(() => {
    orders = [createTestOrder('order-1', { customer_id: 'customer-1' as CustomerId })]
    orderItems = [
      createTestOrderItem('item-1', {
        order_id: OrderId.make('order-1'),
        service_id: ServiceId.make('service-1'),
      }),
      createTestOrderItem('item-2', {
        order_id: OrderId.make('order-1'),
        service_id: ServiceId.make('service-2'),
      }),
    ]
    services = []
  })

  describe('Success Cases', () => {
    it('should return order with all details', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const result = yield* orderRepo.findById(OrderId.make('order-1'))
        return Option.getOrThrow(result)
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.id).toBe('order-1')
      expect(result.customer_id).toBe('customer-1')
    })

    it('should return order with associated items', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderItemRepo = yield* OrderItemRepository
        return yield* orderItemRepo.findByOrderId(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result).toHaveLength(2)
    })
  })

  describe('Not Found Cases', () => {
    it('should return none when order does not exist', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        return yield* orderRepo.findById(OrderId.make('non-existent-order'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('Authentication Cases', () => {
    it('should allow staff to get order', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const result = yield* orderRepo.findById(OrderId.make('order-1'))
        return Option.getOrThrow(result)
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.id).toBe('order-1')
    })

    it('should allow admin to get order', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const result = yield* orderRepo.findById(OrderId.make('order-1'))
        return Option.getOrThrow(result)
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.id).toBe('order-1')
    })
  })
})

// ============================================================================
// PUT /api/orders/:id/status Tests
// ============================================================================

describe('PUT /api/orders/:id/status', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]

  beforeEach(() => {
    orders = [
      createTestOrder('order-1', { status: 'received' as OrderStatus }),
      createTestOrder('order-2', { status: 'in_progress' as OrderStatus }),
      createTestOrder('order-3', { status: 'ready' as OrderStatus }),
      createTestOrder('order-4', { status: 'delivered' as OrderStatus }),
    ]
    orderItems = []
    services = []
  })

  describe('Success Cases', () => {
    it('should update status from "received" to "in_progress"', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus(OrderId.make('order-1'), 'in_progress')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.status).toBe('in_progress')
    })

    it('should update status from "in_progress" to "ready"', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus(OrderId.make('order-2'), 'ready')
        const updated = yield* orderService.findById(OrderId.make('order-2'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.status).toBe('ready')
    })

    it('should update status from "ready" to "delivered"', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus(OrderId.make('order-3'), 'delivered')
        const updated = yield* orderService.findById(OrderId.make('order-3'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.status).toBe('delivered')
    })
  })

  describe('Validation Error Cases', () => {
    it('should fail when order does not exist', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updateStatus(OrderId.make('non-existent-order'), 'in_progress')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should fail for invalid status transition (delivered → any)', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updateStatus(OrderId.make('order-4'), 'in_progress')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('Authentication Cases', () => {
    it('should allow staff to update status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus(OrderId.make('order-1'), 'in_progress')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.status).toBe('in_progress')
    })

    it('should allow admin to update status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus(OrderId.make('order-1'), 'in_progress')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.status).toBe('in_progress')
    })
  })
})

// ============================================================================
// PUT /api/orders/:id/payment Tests
// ============================================================================

describe('PUT /api/orders/:id/payment', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]

  beforeEach(() => {
    orders = [
      createTestOrder('order-1', { payment_status: 'unpaid' as PaymentStatus }),
      createTestOrder('order-2', { payment_status: 'paid' as PaymentStatus }),
    ]
    orderItems = []
    services = []
  })

  describe('Success Cases', () => {
    it('should update payment_status from "unpaid" to "paid"', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updatePaymentStatus(OrderId.make('order-1'), 'paid')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should update payment_status from "paid" to "unpaid"', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updatePaymentStatus(OrderId.make('order-2'), 'unpaid')
        const updated = yield* orderService.findById(OrderId.make('order-2'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('unpaid')
    })
  })

  describe('Validation Error Cases', () => {
    it('should fail when order does not exist', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updatePaymentStatus(OrderId.make('non-existent-order'), 'paid')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('Authentication Cases', () => {
    it('should allow staff to update payment status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updatePaymentStatus(OrderId.make('order-1'), 'paid')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should allow admin to update payment status', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updatePaymentStatus(OrderId.make('order-1'), 'paid')
        const updated = yield* orderService.findById(OrderId.make('order-1'))
        return updated
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('paid')
    })
  })
})

// ============================================================================
// Integration Flow Tests
// ============================================================================

describe('Integration Flow Tests', () => {
  let orders: Order[]
  let orderItems: OrderItem[]
  let services: LaundryService[]

  beforeEach(() => {
    orders = []
    orderItems = []
    services = [
      createTestService('service-1', { name: 'Washing', price: 15000 }),
      createTestService('service-2', { name: 'Ironing', price: 8000 }),
    ]
    vi.spyOn(OrderNumberGenerator, 'generateOrderNumber').mockReturnValue(
      Effect.succeed('ORD-20240215-001')
    )
  })

  describe('Complete Order Lifecycle', () => {
    it('should complete full order workflow: create → update status → update payment → get', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        const orderItemRepo = yield* OrderItemRepository

        // Create order
        const created = yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
        expect(created.status).toBe('received')
        expect(created.payment_status).toBe('unpaid')

        // Update status
        yield* orderService.updateStatus(created.id, 'in_progress')
        const inProgress = yield* orderService.findById(created.id)
        expect(inProgress.status).toBe('in_progress')

        // Update payment
        yield* orderService.updatePaymentStatus(created.id, 'paid')
        const paid = yield* orderService.findById(created.id)
        expect(paid.payment_status).toBe('paid')

        // Get with items
        const items = yield* orderItemRepo.findByOrderId(created.id)

        return { created, inProgress, paid, items }
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.created.status).toBe('received')
      expect(result.inProgress.status).toBe('in_progress')
      expect(result.paid.payment_status).toBe('paid')
      expect(result.items).toHaveLength(1)
    })

    it('should handle order through all status transitions', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService

        const created = yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )

        yield* orderService.updateStatus(created.id, 'in_progress')
        const step1 = yield* orderService.findById(created.id)

        yield* orderService.updateStatus(created.id, 'ready')
        const step2 = yield* orderService.findById(created.id)

        yield* orderService.updateStatus(created.id, 'delivered')
        const step3 = yield* orderService.findById(created.id)

        return { step1, step2, step3 }
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.step1.status).toBe('in_progress')
      expect(result.step2.status).toBe('ready')
      expect(result.step3.status).toBe('delivered')
    })
  })

  describe('Price Calculation Accuracy', () => {
    it('should calculate correct total for multiple different services', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService

        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }), // 2 * 15000 = 30000
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-2'), quantity: 3 }), // 3 * 8000 = 24000
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.total_price).toBe(54000) // 30000 + 24000
    })

    it('should calculate correct total for single item', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService

        return yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 5 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.total_price).toBe(75000) // 5 * 15000
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple order creations independently', async () => {
      const testLayer = createTestLayer(orders, orderItems, services)
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService

        const order1 = yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-1'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )

        const order2 = yield* orderService.create(
          CreateOrderInput.make({
            customer_id: CustomerId.make('customer-2'),
            items: [
              CreateOrderItemInput.make({ service_id: ServiceId.make('service-2'), quantity: 2 }),
            ],
            created_by: UserId.make('test-user-id'),
          })
        )

        return { order1, order2 }
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.order1.customer_id).toBe('customer-1')
      expect(result.order2.customer_id).toBe('customer-2')
      expect(result.order1.total_price).toBe(15000)
      expect(result.order2.total_price).toBe(16000) // 2 * 8000
    })
  })
})
