import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import { ReceiptService } from 'src/usecase/receipt/ReceiptService'
import { OrderId, OrderStatus, PaymentStatus } from '@domain/Order'
import { ReceiptResponse } from '@domain/Receipt'
import { CurrentUser } from '@domain/CurrentUser'
import { UserId } from '@domain/User'
import { UnitType } from '@domain/LaundryService'
import { OrderNotFound } from '@domain/http/HttpErrors'

describe('GET /api/receipts/:orderId', () => {
  let receipts: Map<string, ReceiptResponse>

  beforeEach(() => {
    receipts = new Map()
  })

  const createMockReceiptService = (): ReceiptService => {
    return {
      generateReceipt: vi.fn((orderId: OrderId) => {
        const receipt = receipts.get(orderId)
        if (!receipt) {
          return Effect.fail(new OrderNotFound({ message: `Order not found: ${orderId}`, orderId }))
        }
        return Effect.succeed(receipt)
      }),
    } as unknown as ReceiptService
  }

  const createTestReceipt = (orderId: string, overrides?: Partial<ReceiptResponse>): ReceiptResponse => {
    return {
      business_name: 'Laundry Service',
      business_address: null,
      business_phone: null,
      order_number: `ORD-20240101-${orderId.slice(-4)}`,
      order_date: new Date('2024-01-15T10:00:00Z') as any,
      order_status: 'received' as OrderStatus,
      customer_name: 'John Doe',
      customer_phone: '+628123456789',
      items: [
        {
          service_name: 'Washing',
          unit_type: 'kg' as UnitType,
          quantity: 2,
          price_at_order: 10000,
          subtotal: 20000,
        },
      ],
      total_price: 20000,
      payment_status: 'unpaid' as PaymentStatus,
      staff_name: 'Staff User',
      ...overrides,
    } as unknown as ReceiptResponse
  }

  const createTestLayer = () => {
    const mockReceiptService = createMockReceiptService()
    return Layer.succeed(ReceiptService, mockReceiptService)
  }

  const provideCurrentUser = (role: 'staff' | 'admin' = 'staff') =>
    Layer.succeed(CurrentUser, {
      id: UserId.make('test-user-id'),
      email: 'test@example.com',
      role,
    })

  describe('Success Cases', () => {
    it('should return complete receipt for existing order', async () => {
      const receipt = createTestReceipt('order-1')
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.business_name).toBe('Laundry Service')
      expect(result.order_number).toBe(receipt.order_number)
      expect(result.customer_name).toBe('John Doe')
      expect(result.items).toHaveLength(1)
      expect(result.total_price).toBe(20000)
      expect(result.payment_status).toBe('unpaid')
      expect(result.staff_name).toBe('Staff User')
    })

    it('should be accessible by staff role', async () => {
      const receipt = createTestReceipt('order-1')
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.order_number).toBe(receipt.order_number)
    })

    it('should be accessible by admin role', async () => {
      const receipt = createTestReceipt('order-1')
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.order_number).toBe(receipt.order_number)
    })

    it('should return receipt with multiple items', async () => {
      const receipt = createTestReceipt('order-1', {
        items: [
          {
            service_name: 'Washing',
            unit_type: 'kg' as UnitType,
            quantity: 2,
            price_at_order: 10000,
            subtotal: 20000,
          },
          {
            service_name: 'Ironing',
            unit_type: 'set' as UnitType,
            quantity: 3,
            price_at_order: 5000,
            subtotal: 15000,
          },
        ],
        total_price: 35000,
      } as unknown as ReceiptResponse)
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.items).toHaveLength(2)
      expect(result.items[0]?.service_name).toBe('Washing')
      expect(result.items[1]?.service_name).toBe('Ironing')
      expect(result.total_price).toBe(35000)
    })

    it('should return receipt with paid payment status', async () => {
      const receipt = createTestReceipt('order-1', {
        payment_status: 'paid' as PaymentStatus,
      })
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.payment_status).toBe('paid')
    })

    it('should return receipt with delivered order status', async () => {
      const receipt = createTestReceipt('order-1', {
        order_status: 'delivered' as OrderStatus,
      })
      receipts.set('order-1', receipt)

      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('order-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, fullLayer))

      expect(result.order_status).toBe('delivered')
    })
  })

  describe('Error Cases', () => {
    it('should fail with OrderNotFound when order does not exist', async () => {
      const testLayer = createTestLayer()
      const fullLayer = Layer.mergeAll(testLayer, provideCurrentUser('staff'))

      const program = Effect.gen(function* () {
        const receiptService = yield* ReceiptService
        return yield* receiptService.generateReceipt(OrderId.make('non-existent-order'))
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, fullLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
