import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { generateOrderNumber } from '@domain/OrderNumberGenerator'
import { EmptyOrderError } from '@domain/OrderErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'
import type { CreateOrderInput } from '@domain/Order'
import { Order } from '@domain/Order'

const calculateTotal = (items: Array<{ quantity: number; priceAtOrder: number }>): number =>
  items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)

export const createOrderUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository
  const orderItemRepo = yield* OrderItemRepository
  const serviceRepo = yield* ServiceRepository

  const execute = Effect.fn('CreateOrderUseCase.execute')(function* (data: CreateOrderInput) {
    if (data.items.length === 0) {
      return yield* Effect.fail(
        new EmptyOrderError({ message: 'Order must contain at least one item' })
      )
    }

    const orderNumber = yield* generateOrderNumber()

    const itemsWithPrices = yield* Effect.forEach(
      data.items,
      (item) =>
        Effect.gen(function* () {
          const serviceOption = yield* serviceRepo.findById(item.service_id)

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

    const totalPrice = calculateTotal(itemsWithPrices)

    const order = yield* orderRepo.insert(
      Order.insert.make({
        order_number: orderNumber,
        customer_id: data.customer_id,
        status: 'received',
        payment_status: data.payment_status,
        total_price: totalPrice,
        created_by: data.created_by,
      })
    )

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

  return { execute } as const
})

export class CreateOrderUseCase extends Effect.Service<CreateOrderUseCase>()('CreateOrderUseCase', {
  accessors: true,
  effect: createOrderUseCaseImpl,
  dependencies: [OrderRepository.Default, OrderItemRepository.Default, ServiceRepository.Default],
}) {}
