import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { generateOrderNumber } from '@domain/OrderNumberGenerator'
import { validateStatusTransition } from '@domain/OrderStatusValidator'
import { OrderNotFound, EmptyOrderError } from '@domain/OrderErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'
import { OrderStatus, PaymentStatus, OrderId } from '@domain/Order'
import { ServiceId } from '@domain/LaundryService'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'

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

        // Calculate total
        const totalPrice = calculateTotal(itemsWithPrices)

        // Create order (wrap in transaction if needed)
        const order = yield* orderRepo.insert({
          order_number: orderNumber,
          customer_id: data.customerId as CustomerId,
          status: 'received',
          payment_status: data.paymentStatus || 'unpaid',
          total_price: totalPrice,
          created_by: data.createdBy as UserId,
        })

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

        // Validate status transition
        yield* validateStatusTransition(order.status, newStatus)

        // Update status
        yield* orderRepo.updateStatus(id as OrderId, newStatus)
      })

    const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
      Effect.gen(function* () {
        // Check if order exists
        yield* findById(id)

        // Update payment status
        yield* orderRepo.updatePaymentStatus(id as OrderId, paymentStatus)
      })

    const findByCustomerId = (customerId: string) =>
      orderRepo.findByCustomerId(customerId as CustomerId)

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
