import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { UserRepository } from '@repositories/UserRepository'
import { ReceiptItem, ReceiptResponse } from '@domain/Receipt'
import { OrderId } from '@domain/Order'
import { CustomerId } from '@domain/Customer'
import { OrderNotFound } from '@domain/OrderErrors'

export class ReceiptService extends Effect.Service<ReceiptService>()('ReceiptService', {
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
          return yield* Effect.fail(new OrderNotFound({ orderId: orderId }))
        }
        const order = orderOption.value

        // 2. Fetch items with service details (reuses existing method)
        const items = yield* orderItemRepo.findByOrderIdWithService(orderId)

        // 3. Fetch customer
        const customerOption = yield* customerRepo.findById(order.customer_id)
        const customer = Option.isSome(customerOption)
          ? customerOption.value
          : { name: 'Unknown', phone: '-' }

        // 4. Fetch staff (who created the order)
        const staffOption = yield* userRepo.findBasicInfo(order.created_by)
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
}) {}
