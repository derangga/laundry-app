import { Effect, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { OrderItem, OrderItemWithServiceFromDb, OrderId } from '../domain/Order'
import { ServiceId } from '../domain/LaundryService'

// Helper to decode SQL results through the schema
const decodeOrderItems = Schema.decodeUnknown(Schema.Array(OrderItem))
const decodeOrderItem = Schema.decodeUnknown(OrderItem)
const decodeOrderItemsWithService = Schema.decodeUnknown(Schema.Array(OrderItemWithServiceFromDb))

export interface OrderItemInsertData {
  order_id: OrderId
  service_id: ServiceId
  quantity: number
  price_at_order: number
  subtotal: number
}

export class OrderItemRepository extends Effect.Service<OrderItemRepository>()(
  'OrderItemRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      // Base CRUD from Model.makeRepository
      const repo = yield* Model.makeRepository(OrderItem, {
        tableName: 'order_items',
        spanPrefix: 'OrderItemRepository',
        idColumn: 'id',
      })

      // Custom methods with explicit columns
      const findByOrderId = (
        orderId: OrderId
      ): Effect.Effect<readonly OrderItem[], SqlError.SqlError> =>
        sql`
          SELECT id, order_id, service_id, quantity, price_at_order, subtotal, created_at
          FROM order_items
          WHERE order_id = ${orderId}
          ORDER BY created_at ASC
        `.pipe(Effect.flatMap((rows) => decodeOrderItems(rows).pipe(Effect.orDie)))

      const findByOrderIdWithService = (
        orderId: OrderId
      ): Effect.Effect<readonly OrderItemWithServiceFromDb[], SqlError.SqlError> =>
        sql`
          SELECT
            oi.id,
            oi.order_id,
            oi.service_id,
            s.name AS service_name,
            s.unit_type,
            oi.quantity,
            oi.price_at_order,
            oi.subtotal,
            oi.created_at
          FROM order_items oi
          JOIN services s ON oi.service_id = s.id
          WHERE oi.order_id = ${orderId}
          ORDER BY oi.created_at ASC
        `.pipe(Effect.flatMap((rows) => decodeOrderItemsWithService(rows).pipe(Effect.orDie)))

      const insert = (data: OrderItemInsertData): Effect.Effect<OrderItem, SqlError.SqlError> =>
        sql`
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES (${data.order_id}, ${data.service_id}, ${data.quantity}, ${data.price_at_order}, ${data.subtotal})
          RETURNING id, order_id, service_id, quantity, price_at_order, subtotal, created_at
        `.pipe(
          Effect.map((rows) => rows[0]),
          Effect.flatMap((row) =>
            row
              ? decodeOrderItem(row).pipe(Effect.orDie)
              : Effect.die(new Error('INSERT order_items returned no rows'))
          )
        )

      const insertMany = (
        items: readonly OrderItemInsertData[]
      ): Effect.Effect<readonly OrderItem[], SqlError.SqlError> => {
        if (items.length === 0) {
          return Effect.succeed([])
        }

        // Build a multi-row INSERT statement declaratively
        const itemParams = items.flatMap((item) => [
          item.order_id,
          item.service_id,
          item.quantity,
          item.price_at_order,
          item.subtotal,
        ])
        const placeholders = items
          .map((_, i) => {
            const base = i * 5 + 1
            return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
          })
          .join(', ')

        const query = `
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES ${placeholders}
          RETURNING id, order_id, service_id, quantity, price_at_order, subtotal, created_at
        `

        return sql
          .unsafe(query, itemParams)
          .pipe(Effect.flatMap((rows) => decodeOrderItems(rows).pipe(Effect.orDie)))
      }

      const deleteByOrderId = (orderId: OrderId): Effect.Effect<void, SqlError.SqlError> =>
        sql`DELETE FROM order_items WHERE order_id = ${orderId}`.pipe(Effect.map(() => void 0))

      return {
        // Base CRUD from makeRepository
        findById: repo.findById,

        // Custom methods
        insert,
        findByOrderId,
        findByOrderIdWithService,
        insertMany,
        deleteByOrderId,
      } as const
    }),
  }
) {}
