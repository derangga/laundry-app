import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  CreateOrderUseCase,
  createOrderUseCaseImpl,
} from 'src/usecase/order/CreateOrderUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { EmptyOrderError } from '@domain/OrderErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'
import {
  CreateOrderInput,
  CreateOrderItemInput,
  Order,
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  OrderItemId,
} from '@domain/Order'
import { LaundryService, ServiceId, UnitType } from '@domain/LaundryService'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'

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

const service1 = createTestService('service-1', { name: 'Washing', price: 15000 })
const service2 = createTestService('service-2', {
  name: 'Ironing',
  price: 8000,
  unit_type: 'set' as UnitType,
})

const createMockOrderRepo = () =>
  Layer.succeed(OrderRepository, {
    insert: vi.fn((data: { customer_id: CustomerId; total_price: number; payment_status: PaymentStatus }) =>
      Effect.succeed({
        id: 'new-order-id' as OrderId,
        order_number: 'ORD-1',
        customer_id: data.customer_id,
        status: 'received' as OrderStatus,
        payment_status: data.payment_status,
        total_price: data.total_price,
        created_by: 'user-1' as UserId,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as Order)
    ),
  } as unknown as OrderRepository)

const createMockOrderItemRepo = () =>
  Layer.succeed(OrderItemRepository, {
    insertMany: vi.fn((items: Array<{ service_id: ServiceId; quantity: number }>) =>
      Effect.succeed(
        items.map(
          (item, idx) =>
            ({
              id: `item-${idx}` as OrderItemId,
              order_id: 'new-order-id' as OrderId,
              service_id: item.service_id,
              quantity: item.quantity,
              price_at_order: 0,
              subtotal: 0,
              created_at: new Date(),
            }) as unknown as OrderItem
        )
      )
    ),
  } as unknown as OrderItemRepository)

const createMockServiceRepo = (services: LaundryService[]) =>
  Layer.succeed(ServiceRepository, {
    findById: (id: ServiceId) => {
      const svc = services.find((s) => s.id === id)
      return Effect.succeed(svc ? Option.some(svc) : Option.none())
    },
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[]) =>
  Layer.effect(
    CreateOrderUseCase,
    Effect.map(createOrderUseCaseImpl, (i) => new CreateOrderUseCase(i))
  ).pipe(
    Layer.provide(
      Layer.mergeAll(createMockOrderRepo(), createMockOrderItemRepo(), createMockServiceRepo(services))
    )
  )

describe('CreateOrderUseCase', () => {
  it('creates an order with calculated total', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateOrderUseCase
      return yield* useCase.execute(
        CreateOrderInput.make({
          customer_id: CustomerId.make('customer-1'),
          items: [
            CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 2 }),
            CreateOrderItemInput.make({ service_id: ServiceId.make('service-2'), quantity: 1 }),
          ],
          created_by: UserId.make('user-1'),
        })
      )
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer([service1, service2]))
    )

    expect(result.total_price).toBe(38000)
    expect(result.status).toBe('received')
    expect(result.payment_status).toBe('unpaid')
  })

  it('honors a custom payment_status', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateOrderUseCase
      return yield* useCase.execute(
        CreateOrderInput.make({
          customer_id: CustomerId.make('customer-1'),
          items: [CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 })],
          created_by: UserId.make('user-1'),
          payment_status: 'paid',
        })
      )
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([service1])))

    expect(result.payment_status).toBe('paid')
  })

  it('fails with EmptyOrderError when items is empty', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateOrderUseCase
      return yield* useCase.execute(
        CreateOrderInput.make({
          customer_id: CustomerId.make('customer-1'),
          items: [],
          created_by: UserId.make('user-1'),
        })
      )
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(EmptyOrderError)
    }
  })

  it('fails with ServiceNotFound when an item references a missing service', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateOrderUseCase
      return yield* useCase.execute(
        CreateOrderInput.make({
          customer_id: CustomerId.make('customer-1'),
          items: [
            CreateOrderItemInput.make({ service_id: ServiceId.make('missing'), quantity: 1 }),
          ],
          created_by: UserId.make('user-1'),
        })
      )
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([service1])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(ServiceNotFound)
    }
  })
})
