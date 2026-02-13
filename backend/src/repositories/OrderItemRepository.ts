import { Effect } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { OrderItem, OrderItemWithService, OrderId } from '../domain/Order'
import { ServiceId } from '../domain/LaundryService'

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
        sql<OrderItem>`
          SELECT id, order_id, service_id, quantity, price_at_order, subtotal, created_at
          FROM order_items
          WHERE order_id = ${orderId}
          ORDER BY created_at ASC
        `.pipe(Effect.map((rows) => rows))

      const findByOrderIdWithService = (
        orderId: OrderId
      ): Effect.Effect<readonly OrderItemWithService[], SqlError.SqlError> =>
        sql<OrderItemWithService>`
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
        `.pipe(Effect.map((rows) => rows))

      const insert = (data: OrderItemInsertData): Effect.Effect<OrderItem, SqlError.SqlError> =>
        sql<OrderItem>`
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES (${data.order_id}, ${data.service_id}, ${data.quantity}, ${data.price_at_order}, ${data.subtotal})
          RETURNING id, order_id, service_id, quantity, price_at_order, subtotal, created_at
        `.pipe(
          Effect.flatMap((rows) => {
            const first = rows[0]
            return first !== undefined
              ? Effect.succeed(first)
              : Effect.fail(
                  new SqlError.SqlError({
                    cause: new Error('Insert failed - no row returned'),
                  })
                )
          })
        )

      const insertMany = (
        items: readonly OrderItemInsertData[]
      ): Effect.Effect<readonly OrderItem[], SqlError.SqlError> => {
        if (items.length === 0) {
          return Effect.succeed([])
        }

        // Build a multi-row INSERT statement
        const values: string[] = []
        const params: Array<string | number> = []
        let paramIndex = 1

        for (const item of items) {
          values.push(
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
          )
          params.push(
            item.order_id,
            item.service_id,
            item.quantity,
            item.price_at_order,
            item.subtotal
          )
        }

        const query = `
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES ${values.join(', ')}
          RETURNING id, order_id, service_id, quantity, price_at_order, subtotal, created_at
        `

        return sql.unsafe<OrderItem>(query, params).pipe(Effect.map((rows) => rows))
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
