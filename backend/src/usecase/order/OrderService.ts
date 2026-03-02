import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { generateOrderNumber } from '@domain/OrderNumberGenerator'
import { validateStatusTransition } from '@domain/OrderStatusValidator'
import { OrderNotFound, EmptyOrderError } from '@domain/OrderErrors'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'
import { ServiceNotFound } from '@domain/ServiceErrors'
import {
  OrderStatus,
  PaymentStatus,
  OrderId,
  CreateOrderInput,
  CreateWalkInOrderInput,
  Order,
} from '@domain/Order'
import { CreateCustomerInput } from '@domain/Customer'
import { ServiceId } from '@domain/LaundryService'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'

export class OrderService extends Effect.Service<OrderService>()('OrderService', {
  effect: Effect.gen(function* () {
    const orderRepo = yield* OrderRepository
    const orderItemRepo = yield* OrderItemRepository
    const serviceRepo = yield* ServiceRepository
    const customerService = yield* CustomerService

    const calculateTotal = (items: Array<{ quantity: number; priceAtOrder: number }>): number => {
      return items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)
    }

    const create = (data: CreateOrderInput) =>
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

        // Create order (wrap in transaction if needed)
        const order = yield* orderRepo.insert(
          Order.insert.make({
            order_number: orderNumber,
            customer_id: data.customer_id as CustomerId,
            status: 'received',
            payment_status: data.payment_status || 'unpaid',
            total_price: totalPrice,
            created_by: data.created_by as UserId,
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
      })

    const findById = (id: OrderId) =>
      Effect.gen(function* () {
        const orderOption = yield* orderRepo.findById(id)

        if (Option.isNone(orderOption)) {
          return yield* Effect.fail(new OrderNotFound({ orderId: id }))
        }

        return orderOption.value
      })

    const updateStatus = (id: OrderId, newStatus: OrderStatus) =>
      Effect.gen(function* () {
        const order = yield* findById(id)

        // Validate status transition
        yield* validateStatusTransition(order.status, newStatus)

        // Update status
        yield* orderRepo.updateStatus(id, newStatus)
      })

    const updatePaymentStatus = (id: OrderId, paymentStatus: PaymentStatus) =>
      Effect.gen(function* () {
        // Check if order exists
        yield* findById(id)

        // Update payment status
        yield* orderRepo.updatePaymentStatus(id as OrderId, paymentStatus)
      })

    const createWalkIn = (data: CreateWalkInOrderInput, createdBy: UserId) =>
      Effect.gen(function* () {
        // Check if customer already exists with this phone
        const exists = yield* customerService.checkExists(data.customer_phone)

        if (exists) {
          return yield* Effect.fail(new CustomerAlreadyExists({ phone: data.customer_phone }))
        }

        // Create the customer
        const customer = yield* customerService.create(
          new CreateCustomerInput({
            name: data.customer_name,
            phone: data.customer_phone,
            address: data.customer_address,
          })
        )

        // Create the order using existing create method
        return yield* create(
          new CreateOrderInput({
            customer_id: customer.id as CustomerId,
            items: data.items,
            created_by: createdBy as UserId,
            payment_status: data.payment_status,
          })
        )
      })

    const findByCustomerId = (id: CustomerId) => orderRepo.findByCustomerId(CustomerId.make(id))

    return {
      create,
      createWalkIn,
      findById,
      updateStatus,
      updatePaymentStatus,
      findByCustomerId,
    }
  }),
  dependencies: [
    OrderRepository.Default,
    OrderItemRepository.Default,
    ServiceRepository.Default,
    CustomerService.Default,
  ],
}) {}
