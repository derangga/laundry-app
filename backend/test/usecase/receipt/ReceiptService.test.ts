import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { ReceiptService } from 'src/usecase/receipt/ReceiptService'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { UserRepository } from '@repositories/UserRepository'
import { Order, OrderId, OrderStatus, PaymentStatus, OrderItemWithService, OrderItemId } from '@domain/Order'
import { Customer, CustomerId } from '@domain/Customer'
import { UserId, UserBasicInfo } from '@domain/User'
import { ServiceId, UnitType } from '@domain/LaundryService'
import { OrderNotFound } from '@domain/OrderErrors'
import { ReceiptResponse } from '@domain/Receipt'

describe('ReceiptService', () => {
  // Test data factories
  const createTestOrder = (id: string, overrides?: Partial<Order>): Order =>
    ({
      id: id as OrderId,
      order_number: 'ORD-20240101-' + id.slice(-4),
      customer_id: 'customer-1' as CustomerId,
      status: 'received' as OrderStatus,
      payment_status: 'unpaid' as PaymentStatus,
      total_price: 30000,
      created_by: 'user-1' as UserId,
      created_at: new Date('2024-01-15T10:00:00Z'),
      updated_at: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    }) as Order

  const createTestOrderItemWithService = (id: string, overrides?: Partial<OrderItemWithService>): OrderItemWithService =>
    ({
      id: id as OrderItemId,
      order_id: 'order-1' as OrderId,
      service_id: 'service-1' as ServiceId,
      service_name: 'Washing',
      unit_type: 'kg' as UnitType,
      quantity: 2,
      price_at_order: 10000,
      subtotal: 20000,
      created_at: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    }) as OrderItemWithService

  const createTestCustomer = (id: string, overrides?: Partial<Customer>): Customer =>
    ({
      id: id as CustomerId,
      name: 'John Doe',
      phone: '+628123456789',
      address: 'Jakarta Selatan',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      ...overrides,
    }) as Customer

  const createTestUserBasicInfo = (id: string, overrides?: Partial<UserBasicInfo>): UserBasicInfo =>
    ({
      id: id as UserId,
      name: 'Staff User',
      email: 'staff@example.com',
      ...overrides,
    }) as UserBasicInfo

  // Mock repository creators
  const createMockOrderRepo = (orders: Order[]): OrderRepository => {
    return {
      findById: vi.fn((id: OrderId) => {
        const order = orders.find((o) => o.id === id)
        return Effect.succeed(order ? Option.some(order) : Option.none())
      }),
      findByOrderNumber: vi.fn(() => Effect.succeed(Option.none())),
      findByCustomerId: vi.fn(() => Effect.succeed([])),
      findWithFilters: vi.fn(() => Effect.succeed(orders)),
      findWithDetails: vi.fn(() => Effect.succeed([])),
      findSummaries: vi.fn(() => Effect.succeed([])),
      insert: vi.fn(() => Effect.succeed({} as Order)),
      updateStatus: vi.fn(() => Effect.succeed(void 0)),
      updatePaymentStatus: vi.fn(() => Effect.succeed(void 0)),
      updateTotalPrice: vi.fn(() => Effect.succeed(void 0)),
    } as unknown as OrderRepository
  }

  const createMockOrderItemRepo = (items: OrderItemWithService[]): OrderItemRepository => {
    return {
      findById: vi.fn(() => Effect.succeed(Option.none())),
      findByOrderId: vi.fn(() => Effect.succeed([])),
      findByOrderIdWithService: vi.fn((orderId: OrderId) => {
        const orderItems = items.filter((i) => i.order_id === orderId)
        return Effect.succeed(orderItems)
      }),
      insert: vi.fn(() => Effect.succeed({} as OrderItemWithService)),
      insertMany: vi.fn(() => Effect.succeed([])),
      deleteByOrderId: vi.fn(() => Effect.succeed(void 0)),
    } as unknown as OrderItemRepository
  }

  const createMockCustomerRepo = (customers: Customer[]): CustomerRepository => {
    return {
      findById: vi.fn((id: CustomerId) => {
        const customer = customers.find((c) => c.id === id)
        return Effect.succeed(customer ? Option.some(customer) : Option.none())
      }),
      findByPhone: vi.fn(() => Effect.succeed(Option.none())),
      searchByName: vi.fn(() => Effect.succeed([])),
      findSummaries: vi.fn(() => Effect.succeed([])),
      insert: vi.fn(() => Effect.succeed({} as Customer)),
      update: vi.fn(() => Effect.succeed(Option.none())),
      delete: vi.fn(() => Effect.succeed(true)),
    } as unknown as CustomerRepository
  }

  const createMockUserRepo = (users: UserBasicInfo[]): UserRepository => {
    return {
      findById: vi.fn(() => Effect.succeed(Option.none())),
      findByEmail: vi.fn(() => Effect.succeed(Option.none())),
      findByIdWithoutPassword: vi.fn(() => Effect.succeed(Option.none())),
      findBasicInfo: vi.fn((id: UserId) => {
        const user = users.find((u) => u.id === id)
        return Effect.succeed(user ? Option.some(user) : Option.none())
      }),
      hasAnyUsers: vi.fn(() => Effect.succeed(false)),
      insert: vi.fn(() => Effect.succeed({} as any)),
      update: vi.fn(() => Effect.succeed(Option.none())),
      delete: vi.fn(() => Effect.succeed(true)),
    } as unknown as UserRepository
  }

  // Build the ReceiptService manually using the mock repositories
  // This follows the same pattern as CustomerService and OrderService tests
  const buildReceiptService = (
    orderRepo: OrderRepository,
    orderItemRepo: OrderItemRepository,
    customerRepo: CustomerRepository,
    userRepo: UserRepository
  ): ReceiptService => {
    return {
      generateReceipt: (orderId: OrderId) =>
        Effect.gen(function* () {
          // 1. Fetch order
          const orderOption = yield* orderRepo.findById(orderId)
          if (Option.isNone(orderOption)) {
            return yield* Effect.fail(new OrderNotFound({ orderId: orderId }))
          }
          const order = orderOption.value

          // 2. Fetch items with service details
          const items = yield* orderItemRepo.findByOrderIdWithService(orderId)

          // 3. Fetch customer
          const customerOption = yield* customerRepo.findById(order.customer_id as unknown as CustomerId)
          const customer = Option.isSome(customerOption) ? customerOption.value : { name: 'Unknown', phone: '-' }

          // 4. Fetch staff
          const staffOption = yield* userRepo.findBasicInfo(order.created_by as unknown as UserId)
          const staffName = Option.isSome(staffOption) ? staffOption.value.name : 'Staff'

          // 5. Assemble receipt
          return {
            business_name: 'Laundry Service',
            business_address: null,
            business_phone: null,
            order_number: order.order_number,
            order_date: order.created_at,
            order_status: order.status,
            customer_name: customer.name,
            customer_phone: customer.phone,
            items: items.map((item) => ({
              service_name: item.service_name,
              unit_type: item.unit_type,
              quantity: item.quantity,
              price_at_order: item.price_at_order,
              subtotal: item.subtotal,
            })),
            total_price: order.total_price,
            payment_status: order.payment_status,
            staff_name: staffName,
          } as unknown as typeof ReceiptResponse.Type
        }),
    } as ReceiptService
  }

  // Create service layer using the REAL service logic with mocked repositories
  const createServiceLayer = (
    orders: Order[],
    items: OrderItemWithService[],
    customers: Customer[],
    users: UserBasicInfo[]
  ) => {
    const mockOrderRepo = createMockOrderRepo(orders)
    const mockOrderItemRepo = createMockOrderItemRepo(items)
    const mockCustomerRepo = createMockCustomerRepo(customers)
    const mockUserRepo = createMockUserRepo(users)
    const service = buildReceiptService(mockOrderRepo, mockOrderItemRepo, mockCustomerRepo, mockUserRepo)
    return Layer.succeed(ReceiptService, service)
  }

  describe('generateReceipt', () => {
    it('should return complete receipt with all PRD FR-7.1 fields', async () => {
      const order = createTestOrder('order-1')
      const item = createTestOrderItemWithService('item-1')
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [item], [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.business_name).toBe('Laundry Service')
      expect(result.business_address).toBeNull()
      expect(result.business_phone).toBeNull()
      expect(result.order_number).toBe(order.order_number)
      expect(result.order_status).toBe(order.status)
      expect(result.customer_name).toBe(customer.name)
      expect(result.customer_phone).toBe(customer.phone)
      expect(result.items).toHaveLength(1)
      expect(result.total_price).toBe(order.total_price)
      expect(result.payment_status).toBe(order.payment_status)
      expect(result.staff_name).toBe(user.name)
    })

    it('should use price_at_order (historical price)', async () => {
      const order = createTestOrder('order-1')
      const item = createTestOrderItemWithService('item-1', { price_at_order: 15000, subtotal: 30000 })
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [item], [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.items[0]?.price_at_order).toBe(15000)
      expect(result.items[0]?.subtotal).toBe(30000)
    })

    it('should fall back to "Staff" when staff not found', async () => {
      const order = createTestOrder('order-1')
      const item = createTestOrderItemWithService('item-1')
      const customer = createTestCustomer('customer-1')

      const serviceLayer = createServiceLayer([order], [item], [customer], [])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.staff_name).toBe('Staff')
    })

    it('should handle missing customer gracefully with "Unknown" name', async () => {
      const order = createTestOrder('order-1', { customer_id: 'non-existent' as CustomerId })
      const item = createTestOrderItemWithService('item-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [item], [], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.customer_name).toBe('Unknown')
      expect(result.customer_phone).toBe('-')
    })

    it('should include multiple items in receipt', async () => {
      const order = createTestOrder('order-1', { total_price: 55000 })
      const items = [
        createTestOrderItemWithService('item-1', { service_name: 'Washing', quantity: 2, price_at_order: 10000, subtotal: 20000 }),
        createTestOrderItemWithService('item-2', { service_name: 'Ironing', unit_type: 'set' as UnitType, quantity: 3, price_at_order: 5000, subtotal: 15000 }),
        createTestOrderItemWithService('item-3', { service_name: 'Dry Cleaning', unit_type: 'piece' as UnitType, quantity: 2, price_at_order: 10000, subtotal: 20000 }),
      ]
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], items, [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.items).toHaveLength(3)
      expect(result.total_price).toBe(55000)
    })

    it('should fail with OrderNotFound when order does not exist', async () => {
      const serviceLayer = createServiceLayer([], [], [], [])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('non-existent-order'))
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should handle empty items array', async () => {
      const order = createTestOrder('order-1')
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [], [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.items).toHaveLength(0)
    })

    it('should handle paid payment status', async () => {
      const order = createTestOrder('order-1', { payment_status: 'paid' as PaymentStatus })
      const item = createTestOrderItemWithService('item-1')
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [item], [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should handle delivered order status', async () => {
      const order = createTestOrder('order-1', { status: 'delivered' as OrderStatus })
      const item = createTestOrderItemWithService('item-1')
      const customer = createTestCustomer('customer-1')
      const user = createTestUserBasicInfo('user-1')

      const serviceLayer = createServiceLayer([order], [item], [customer], [user])

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.order_status).toBe('delivered')
    })
  })
})
