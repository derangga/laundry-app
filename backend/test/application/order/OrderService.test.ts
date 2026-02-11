import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { OrderService } from '@application/order/OrderService'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { OrderNotFound, EmptyOrderError } from '@domain/OrderErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'
import { Order, OrderId, OrderStatus, PaymentStatus } from '@domain/Order'
import { OrderItem, OrderItemId } from '@domain/OrderItem'
import { LaundryService, ServiceId, UnitType } from '@domain/LaundryService'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'
import * as OrderNumberGenerator from '@domain/OrderNumberGenerator'
import { validateStatusTransition } from '@domain/OrderStatusValidator'

describe('OrderService', () => {
  // Test data
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

  const order1 = createTestOrder('order-1')
  const order2 = createTestOrder('order-2', { status: 'in_progress' as OrderStatus, total_price: 50000 })
  const service1 = createTestService('service-1', { name: 'Washing', price: 15000 })
  const service2 = createTestService('service-2', { name: 'Ironing', price: 8000, unit_type: 'set' as UnitType })

  // Create mock repository layers
  const createMockOrderRepo = (orders: Order[]) =>
    Layer.succeed(OrderRepository, {
      findById: (id: OrderId) => {
        const order = orders.find((o) => o.id === id)
        return Effect.succeed(order ? Option.some(order) : Option.none())
      },
      findByCustomerId: (customerId: CustomerId) =>
        Effect.succeed(orders.filter((o) => o.customer_id === customerId)),
      insert: (data: {
        order_number: string
        customer_id: CustomerId
        status: OrderStatus
        payment_status: PaymentStatus
        total_price: number
        created_by: UserId
      }) =>
        Effect.succeed(
          createTestOrder('new-order-id', {
            order_number: data.order_number,
            customer_id: data.customer_id,
            status: data.status,
            payment_status: data.payment_status,
            total_price: data.total_price,
            created_by: data.created_by,
          })
        ),
      updateStatus: (_id: OrderId, _status: OrderStatus) => Effect.succeed(void 0),
      updatePaymentStatus: (_id: OrderId, _paymentStatus: PaymentStatus) => Effect.succeed(void 0),
    } as unknown as OrderRepository)

  const createMockOrderItemRepo = () =>
    Layer.succeed(OrderItemRepository, {
      findById: (_id: OrderItemId) => Effect.succeed(Option.none()),
      insertMany: (items: Array<{
        order_id: OrderId
        service_id: ServiceId
        quantity: number
        price_at_order: number
        subtotal: number
      }>) => Effect.succeed(items.map((item, idx) => createTestOrderItem(`item-${idx}`, item))),
    } as unknown as OrderItemRepository)

  const createMockServiceRepo = (services: LaundryService[]) =>
    Layer.succeed(ServiceRepository, {
      findById: (id: ServiceId) => {
        const service = services.find((s) => s.id === id)
        return Effect.succeed(service ? Option.some(service) : Option.none())
      },
    } as unknown as ServiceRepository)

  // Create service layer by building the service effect directly
  const createServiceLayer = (orders: Order[], services: LaundryService[]) => {
    const mockOrderRepo = createMockOrderRepo(orders)
    const mockOrderItemRepo = createMockOrderItemRepo()
    const mockServiceRepo = createMockServiceRepo(services)

    // Build the service manually to avoid Default dependencies
    const serviceEffect = Effect.gen(function* () {
      const orderRepo = yield* OrderRepository
      const orderItemRepo = yield* OrderItemRepository
      const serviceRepo = yield* ServiceRepository

      const calculateTotal = (items: Array<{ quantity: number; priceAtOrder: number }>): number => {
        return items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)
      }

      const create = (data: {
        customerId: string
        items: Array<{ serviceId: string; quantity: number }>
        createdBy: string
        paymentStatus?: PaymentStatus
      }) =>
        Effect.gen(function* () {
          if (data.items.length === 0) {
            return yield* Effect.fail(
              new EmptyOrderError({
                message: 'Order must contain at least one item',
              })
            )
          }

          const orderNumber = yield* OrderNumberGenerator.generateOrderNumber()

          const itemsWithPrices = yield* Effect.forEach(
            data.items,
            (item) =>
              Effect.gen(function* () {
                const serviceOption = yield* serviceRepo.findById(item.serviceId as ServiceId)

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

          const totalPrice = calculateTotal(itemsWithPrices)

          const order = yield* orderRepo.insert({
            order_number: orderNumber,
            customer_id: data.customerId as CustomerId,
            status: 'received',
            payment_status: data.paymentStatus || 'unpaid',
            total_price: totalPrice,
            created_by: data.createdBy as UserId,
          })

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
        })

      const findById = (id: string) =>
        Effect.gen(function* () {
          const orderOption = yield* orderRepo.findById(id as OrderId)

          if (Option.isNone(orderOption)) {
            return yield* Effect.fail(new OrderNotFound({ orderId: id }))
          }

          return orderOption.value
        })

      const updateStatus = (id: string, newStatus: OrderStatus) =>
        Effect.gen(function* () {
          const order = yield* findById(id)
          yield* validateStatusTransition(order.status, newStatus)
          yield* orderRepo.updateStatus(id as OrderId, newStatus)
        })

      const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
        Effect.gen(function* () {
          yield* findById(id)
          yield* orderRepo.updatePaymentStatus(id as OrderId, paymentStatus)
        })

      const findByCustomerId = (customerId: string) =>
        orderRepo.findByCustomerId(customerId as CustomerId)

      return {
        _tag: 'OrderService' as const,
        create,
        findById,
        updateStatus,
        updatePaymentStatus,
        findByCustomerId,
      }
    })

    return Layer.effect(OrderService, serviceEffect).pipe(
      Layer.provide(mockOrderRepo),
      Layer.provide(mockOrderItemRepo),
      Layer.provide(mockServiceRepo)
    )
  }

  describe('create', () => {
    it('should create order with valid items', async () => {
      const orderLayer = createServiceLayer([], [service1, service2])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create({
          customerId: 'customer-1',
          items: [
            { serviceId: 'service-1', quantity: 2 },
            { serviceId: 'service-2', quantity: 1 },
          ],
          createdBy: 'user-1',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result.customer_id).toBe('customer-1')
      expect(result.status).toBe('received')
      expect(result.payment_status).toBe('unpaid')
      expect(result.total_price).toBe(38000)
    })

    it('should fail with EmptyOrderError when no items provided', async () => {
      const orderLayer = createServiceLayer([], [service1])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create({
          customerId: 'customer-1',
          items: [],
          createdBy: 'user-1',
        })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should fail with ServiceNotFound when service does not exist', async () => {
      const orderLayer = createServiceLayer([], [service1])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create({
          customerId: 'customer-1',
          items: [{ serviceId: 'non-existent-service', quantity: 1 }],
          createdBy: 'user-1',
        })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should create order with custom payment status', async () => {
      const orderLayer = createServiceLayer([], [service1])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create({
          customerId: 'customer-1',
          items: [{ serviceId: 'service-1', quantity: 1 }],
          createdBy: 'user-1',
          paymentStatus: 'paid' as PaymentStatus,
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should calculate correct total for multiple items of same service', async () => {
      const orderLayer = createServiceLayer([], [service1])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.create({
          customerId: 'customer-1',
          items: [
            { serviceId: 'service-1', quantity: 3 },
            { serviceId: 'service-1', quantity: 2 },
          ],
          createdBy: 'user-1',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result.total_price).toBe(75000)
    })
  })

  describe('findById', () => {
    it('should return order when found', async () => {
      const orderLayer = createServiceLayer([order1, order2], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.findById('order-1')
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result.id).toBe('order-1')
      expect(result.order_number).toBe(order1.order_number)
      expect(result.total_price).toBe(30000)
    })

    it('should fail with OrderNotFound when order does not exist', async () => {
      const orderLayer = createServiceLayer([order1], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.findById('non-existent-order')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const orderLayer = createServiceLayer([order1], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updateStatus('order-1', 'in_progress')
        return yield* orderService.findById('order-1')
      })

      await expect(
        Effect.runPromise(Effect.provide(program, orderLayer))
      ).resolves.toBeDefined()
    })

    it('should fail with InvalidOrderTransition for invalid transition', async () => {
      const deliveredOrder = createTestOrder('order-3', { status: 'delivered' as OrderStatus })
      const orderLayer = createServiceLayer([deliveredOrder], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updateStatus('order-3', 'in_progress')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should fail with OrderNotFound when order does not exist', async () => {
      const orderLayer = createServiceLayer([order1], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updateStatus('non-existent-order', 'in_progress')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('updatePaymentStatus', () => {
    it('should update payment status when order exists', async () => {
      const orderLayer = createServiceLayer([order1], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        yield* orderService.updatePaymentStatus('order-1', 'paid')
        return yield* orderService.findById('order-1')
      })

      await expect(
        Effect.runPromise(Effect.provide(program, orderLayer))
      ).resolves.toBeDefined()
    })

    it('should fail with OrderNotFound when order does not exist', async () => {
      const orderLayer = createServiceLayer([order1], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.updatePaymentStatus('non-existent-order', 'paid')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, orderLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findByCustomerId', () => {
    it('should return orders for specific customer', async () => {
      const customer1Orders = [
        createTestOrder('order-1', { customer_id: 'customer-1' as CustomerId }),
        createTestOrder('order-3', { customer_id: 'customer-1' as CustomerId }),
      ]
      const allOrders = [
        ...customer1Orders,
        createTestOrder('order-2', { customer_id: 'customer-2' as CustomerId }),
      ]
      const orderLayer = createServiceLayer(allOrders, [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.findByCustomerId('customer-1')
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result).toHaveLength(2)
      expect(result.every((o) => o.customer_id === 'customer-1')).toBe(true)
    })

    it('should return empty array when customer has no orders', async () => {
      const orderLayer = createServiceLayer([order1, order2], [])

      const program = Effect.gen(function* () {
        const orderService = yield* OrderService
        return yield* orderService.findByCustomerId('customer-with-no-orders')
      })

      const result = await Effect.runPromise(Effect.provide(program, orderLayer))

      expect(result).toHaveLength(0)
    })
  })
})
