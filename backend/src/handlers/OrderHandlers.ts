import { HttpApiBuilder } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { AppApi } from '@api/AppApi'
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
  CustomerAlreadyExists,
  ValidationError,
  UnprocessibleEntity,
  RetrieveDataEror,
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
export const OrderHandlersLive = HttpApiBuilder.group(AppApi, 'Orders', (handlers) =>
  handlers
    /**
     * Create walk-in order (new customer + order in one step)
     * POST /api/orders/walk-in
     * Payload: CreateWalkInOrderInput (automatically validated by HttpApiBuilder)
     * Returns: OrderResponse (201 Created)
     * Errors: 409 (customer exists), 422 (empty order), 400 (validation)
     */
    .handle('createWalkIn', ({ payload }) =>
      Effect.gen(function* () {
        const orderService = yield* OrderService
        const currentUser = yield* CurrentUser

        const order = yield* orderService.createWalkIn(payload, currentUser.id)

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
      }).pipe(
        Effect.catchTags({
          CustomerAlreadyExists: (error) =>
            new CustomerAlreadyExists({
              message: `Customer already exists with phone: ${error.phone}. Use POST /api/orders instead.`,
              phone: error.phone,
            }),
          EmptyOrderError: (error) => new EmptyOrderError({ message: error.message }),
          ServiceNotFound: (error) =>
            new ValidationError({
              message: `Service not found: ${error.serviceId}`,
              field: 'items',
            }),
          InvalidPhoneNumber: (error) =>
            new ValidationError({
              message: error.message,
              field: 'customer_phone',
            }),
          SqlError: (error) =>
            new UnprocessibleEntity({
              message: error.message || 'Failed to create walk-in order',
            }),
        })
      )
    )

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
            Effect.catchTags({
              EmptyOrderError: (error) =>
                new EmptyOrderError({
                  message: error.message,
                }),
              ServiceNotFound: (error) =>
                new ValidationError({
                  message: `Service not found: ${error.serviceId}`,
                  field: 'items',
                }),
              SqlError: () =>
                new UnprocessibleEntity({
                  message: 'Failed to create order',
                }),
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
    .handle('list', ({ urlParams }) =>
      Effect.gen(function* () {
        const orderRepo = yield* OrderRepository

        // Decode an optional url param through a schema, failing with ValidationError if invalid
        const decodeOptionalParam = <A>(
          value: string | undefined,
          schema: Schema.Schema<A>,
          field: string
        ): Effect.Effect<Option.Option<A>, ValidationError> =>
          Effect.if(value === undefined, {
            onTrue: () => Effect.succeed(Option.none()),
            onFalse: () =>
              Schema.decodeUnknown(schema)(value).pipe(
                Effect.map(Option.some),
                Effect.mapError(
                  () => new ValidationError({ message: `Invalid ${field} value: ${value}`, field })
                )
              ),
          })

        // Build filter options from validated urlParams
        const customerIdOption = Option.fromNullable(urlParams.customer_id).pipe(
          Option.map(CustomerId.make)
        )
        const statusOption = yield* decodeOptionalParam(urlParams.status, OrderStatus, 'status')
        const paymentStatusOption = yield* decodeOptionalParam(
          urlParams.payment_status,
          PaymentStatus,
          'payment_status'
        )
        const orderNumberOption = Option.fromNullable(urlParams.order_number)
        const startDateOption = Option.fromNullable(urlParams.start_date).pipe(
          Option.map((d) => new Date(d))
        )
        const endDateOption = Option.fromNullable(urlParams.end_date).pipe(
          Option.map((d) => new Date(d))
        )

        const filters = OrderFilterOptions.make({
          customer_id: customerIdOption,
          status: statusOption,
          payment_status: paymentStatusOption,
          order_number: orderNumberOption,
          start_date: startDateOption,
          end_date: endDateOption,
          limit: Option.none(),
          offset: Option.none(),
        })

        const orders = yield* orderRepo.findWithDetails(filters).pipe(
          Effect.catchTags({
            SqlError: (error) =>
              new RetrieveDataEror({
                message: `Failed to retrieve orders: ${error.message}`,
              }),
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
          Effect.catchTags({
            SqlError: (error) =>
              new ValidationError({
                message: `Failed to retrieve order items: ${error.message}`,
              }),
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
        const id = path.id

        // Update status and get updated order
        const order = yield* orderService.updateStatus(OrderId.make(id), payload.status).pipe(
          Effect.catchTags({
            OrderNotFound: () =>
              new OrderNotFound({
                message: `Order not found with id: ${id}`,
                orderId: id,
              }),
            InvalidOrderTransition: (error) =>
              new InvalidOrderStatus({
                message: `Invalid status transition from ${error.from} to ${error.to}`,
                currentStatus: error.from,
                attemptedStatus: error.to,
              }),
            SqlError: () =>
              new UnprocessibleEntity({
                message: 'Failed to update order status',
              }),
          })
        )

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
        const id = path.id

        // Update payment status and get updated order
        const order = yield* orderService
          .updatePaymentStatus(OrderId.make(id), payload.payment_status)
          .pipe(
            Effect.catchTags({
              OrderNotFound: () => new OrderNotFound({ message: `Order not found with id: ${id}` }),
              SqlError: () =>
                new UnprocessibleEntity({ message: 'Failed to update payment status' }),
            })
          )

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
