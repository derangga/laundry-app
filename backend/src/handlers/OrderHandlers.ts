import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { OrderApi } from '@api/OrderApi'
import { OrderService } from 'src/usecase/order/OrderService'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import {
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderResponse,
  OrderWithItemsResponse,
  OrderItemResponse,
  OrderFilterOptions,
} from '@domain/Order'
import { CustomerId } from '@domain/Customer'
import { CurrentUser } from '@domain/CurrentUser'
import {
  OrderNotFound,
  InvalidOrderStatus,
  EmptyOrderError,
  ValidationError,
} from '@domain/http/HttpErrors'

/**
 * Order API Handlers
 *
 * Implements handlers for order management endpoints using HttpApiBuilder.
 * Automatically validates payloads, handles errors, and returns typed responses.
 *
 * Error mapping pattern:
 * - Domain errors (Data.TaggedError) are caught and mapped to HTTP errors
 * - HTTP errors include proper status codes and message formats
 */
export const OrderHandlersLive = HttpApiBuilder.group(OrderApi, 'Orders', (handlers) =>
  handlers
    /**
     * Create new order
     * POST /api/orders
     * Payload: CreateOrderInput (automatically validated by HttpApiBuilder)
     * Returns: OrderResponse (201 Created)
     * Errors: 400 (validation), 422 (empty order)
     */
    .handle('create', ({ payload }) =>
      Effect.gen(function* () {
        const orderService = yield* OrderService
        const currentUser = yield* CurrentUser

        // Create order with current user as created_by
        const order = yield* orderService
          .create({
            ...payload,
            created_by: currentUser.id,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error._tag === 'EmptyOrderError') {
                return new EmptyOrderError({
                  message: error.message,
                })
              }
              if (error._tag === 'ServiceNotFound') {
                return new ValidationError({
                  message: `Service not found: ${error.serviceId}`,
                  field: 'items',
                })
              }
              return new ValidationError({
                message: error.message || 'Failed to create order',
              })
            })
          )

        // Map Order to OrderResponse
        return OrderResponse.make({
          id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          status: order.status,
          payment_status: order.payment_status,
          total_price: order.total_price,
          created_by: order.created_by,
          created_at: order.created_at,
          updated_at: order.updated_at,
        })
      })
    )

    /**
     * List orders with optional filters
     * GET /api/orders?customer_id={id}&status={status}&payment_status={status}
     * Returns: Array of OrderWithDetails
     * Errors: 400 (validation)
     */
    .handle('list', () =>
      Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const request = yield* HttpServerRequest.HttpServerRequest

        // Extract query parameters
        const url = new URL(request.url, 'http://localhost')
        const customerIdParam = url.searchParams.get('customer_id')
        const statusParam = url.searchParams.get('status')
        const paymentStatusParam = url.searchParams.get('payment_status')

        // Build filter options with proper Option types
        let customerIdOption: Option.Option<CustomerId> = Option.none()
        let statusOption: Option.Option<OrderStatus> = Option.none()
        let paymentStatusOption: Option.Option<PaymentStatus> = Option.none()

        if (customerIdParam) {
          customerIdOption = Option.some(CustomerId.make(customerIdParam))
        }

        if (statusParam) {
          const statusDecode = Schema.decodeUnknownOption(OrderStatus)(statusParam)
          if (statusDecode._tag === 'Some') {
            statusOption = Option.some(statusDecode.value)
          } else {
            return yield* Effect.fail(
              new ValidationError({
                message: `Invalid status value: ${statusParam}`,
                field: 'status',
              })
            )
          }
        }

        if (paymentStatusParam) {
          const paymentDecode = Schema.decodeUnknownOption(PaymentStatus)(paymentStatusParam)
          if (paymentDecode._tag === 'Some') {
            paymentStatusOption = Option.some(paymentDecode.value)
          } else {
            return yield* Effect.fail(
              new ValidationError({
                message: `Invalid payment_status value: ${paymentStatusParam}`,
                field: 'payment_status',
              })
            )
          }
        }

        // Get orders with details
        const filters = OrderFilterOptions.make({
          customer_id: customerIdOption,
          status: statusOption,
          payment_status: paymentStatusOption,
          start_date: Option.none(),
          end_date: Option.none(),
          limit: Option.none(),
          offset: Option.none(),
        })

        const orders = yield* orderRepo.findWithDetails(filters).pipe(
          Effect.mapError((error) => {
            return new ValidationError({
              message: `Failed to retrieve orders: ${error.message}`,
            })
          })
        )

        return orders
      })
    )

    /**
     * Get order by ID with items
     * GET /api/orders/:id
     * Returns: OrderWithItemsResponse
     * Errors: 404 (not found), 400 (validation)
     */
    .handle('getById', ({ path }) =>
      Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const orderItemRepo = yield* OrderItemRepository

        const id = path.id

        if (!id) {
          return yield* Effect.fail(
            new ValidationError({
              message: 'Order ID is required',
              field: 'id',
            })
          )
        }

        // Find order
        const orderOption = yield* orderRepo.findById(OrderId.make(id))

        if (Option.isNone(orderOption)) {
          return yield* Effect.fail(
            new OrderNotFound({
              message: `Order not found with id: ${id}`,
              orderId: id,
            })
          )
        }

        const order = orderOption.value

        // Find order items
        const items = yield* orderItemRepo.findByOrderId(order.id).pipe(
          Effect.mapError((error) => {
            return new ValidationError({
              message: `Failed to retrieve order items: ${error.message}`,
            })
          })
        )

        // Build response with items
        return OrderWithItemsResponse.make({
          id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          status: order.status,
          payment_status: order.payment_status,
          total_price: order.total_price,
          created_by: order.created_by,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: items.map((item) =>
            OrderItemResponse.make({
              id: item.id,
              service_id: item.service_id,
              quantity: item.quantity,
              price_at_order: item.price_at_order,
              subtotal: item.subtotal,
            })
          ),
        })
      })
    )

    /**
     * Update order status
     * PUT /api/orders/:id/status
     * Payload: UpdateOrderStatusInput
     * Returns: OrderResponse
     * Errors: 404 (not found), 422 (invalid transition), 400 (validation)
     */
    .handle('updateStatus', ({ path, payload }) =>
      Effect.gen(function* () {
        const orderService = yield* OrderService
        const orderRepo = yield* OrderRepository
        const id = path.id

        // Update status
        yield* orderService.updateStatus(OrderId.make(id), payload.status).pipe(
          Effect.mapError((error) => {
            if (error._tag === 'OrderNotFound') {
              return new OrderNotFound({
                message: `Order not found with id: ${id}`,
                orderId: id,
              })
            }
            if (error._tag === 'InvalidOrderTransition') {
              return new InvalidOrderStatus({
                message: `Invalid status transition from ${error.from} to ${error.to}`,
                currentStatus: error.from,
                attemptedStatus: error.to,
              })
            }
            return new ValidationError({
              message: error.message || 'Failed to update order status',
            })
          })
        )

        // Fetch updated order
        const updatedOrderOption = yield* orderRepo.findById(OrderId.make(id))

        if (Option.isNone(updatedOrderOption)) {
          return yield* Effect.fail(
            new OrderNotFound({
              message: `Order not found with id: ${id}`,
              orderId: id,
            })
          )
        }

        const order = updatedOrderOption.value

        return OrderResponse.make({
          id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          status: order.status,
          payment_status: order.payment_status,
          total_price: order.total_price,
          created_by: order.created_by,
          created_at: order.created_at,
          updated_at: order.updated_at,
        })
      })
    )

    /**
     * Update payment status
     * PUT /api/orders/:id/payment
     * Payload: UpdatePaymentStatusInput
     * Returns: OrderResponse
     * Errors: 404 (not found), 400 (validation)
     */
    .handle('updatePayment', ({ path, payload }) =>
      Effect.gen(function* () {
        const orderService = yield* OrderService
        const orderRepo = yield* OrderRepository
        const id = path.id

        // Update payment status
        yield* orderService.updatePaymentStatus(OrderId.make(id), payload.payment_status).pipe(
          Effect.mapError((error) => {
            if (error._tag === 'OrderNotFound') {
              return new OrderNotFound({
                message: `Order not found with id: ${id}`,
                orderId: id,
              })
            }
            return new ValidationError({
              message: error.message || 'Failed to update payment status',
            })
          })
        )

        // Fetch updated order
        const updatedOrderOption = yield* orderRepo.findById(OrderId.make(id))

        if (Option.isNone(updatedOrderOption)) {
          return yield* Effect.fail(
            new OrderNotFound({
              message: `Order not found with id: ${id}`,
              orderId: id,
            })
          )
        }

        const order = updatedOrderOption.value

        return OrderResponse.make({
          id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          status: order.status,
          payment_status: order.payment_status,
          total_price: order.total_price,
          created_by: order.created_by,
          created_at: order.created_at,
          updated_at: order.updated_at,
        })
      })
    )
)
