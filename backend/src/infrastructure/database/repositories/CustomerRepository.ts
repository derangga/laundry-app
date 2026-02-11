import { Effect, Option } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  Customer,
  CustomerId,
  CustomerSummary,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../../../domain/Customer'

export class CustomerRepository extends Effect.Service<CustomerRepository>()('CustomerRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(Customer, {
      tableName: 'customers',
      spanPrefix: 'CustomerRepository',
      idColumn: 'id',
    })

    // Custom methods with explicit columns
    const findByPhone = (
      phone: string
    ): Effect.Effect<Option.Option<Customer>, SqlError.SqlError> =>
      sql<Customer>`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE phone = ${phone}
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

    const searchByName = (name: string): Effect.Effect<readonly Customer[], SqlError.SqlError> =>
      sql<Customer>`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE name ILIKE ${'%' + name + '%'}
        ORDER BY name ASC
      `.pipe(Effect.map((rows) => rows))

    const findSummaries = (): Effect.Effect<readonly CustomerSummary[], SqlError.SqlError> =>
      sql<CustomerSummary>`
        SELECT id, name, phone
        FROM customers
        ORDER BY name ASC
      `.pipe(Effect.map((rows) => rows))

    const insert = (data: CreateCustomerInput): Effect.Effect<Customer, SqlError.SqlError> =>
      sql<Customer>`
        INSERT INTO customers (name, phone, address)
        VALUES (${data.name}, ${data.phone}, ${data.address})
        RETURNING id, name, phone, address, created_at, updated_at
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

    const update = (
      id: CustomerId,
      data: UpdateCustomerInput
    ): Effect.Effect<Option.Option<Customer>, SqlError.SqlError> => {
      const updates: string[] = []
      const params: Array<string | CustomerId | null> = []
      let paramIndex = 1

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`)
        params.push(data.phone)
      }
      if (data.address !== undefined) {
        updates.push(`address = $${paramIndex++}`)
        params.push(data.address)
      }

      if (updates.length === 0) {
        return repo.findById(id)
      }

      updates.push(`updated_at = NOW()`)
      params.push(id)

      const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, phone, address, created_at, updated_at`

      return sql.unsafe<Customer>(query, params).pipe(
        Effect.map((rows) => Option.fromNullable(rows[0]))
      )
    }

    return {
      // Base CRUD from makeRepository
      findById: repo.findById,
      delete: repo.delete,

      // Custom methods
      insert,
      update,
      findByPhone,
      searchByName,
      findSummaries,
    } as const
  }),
}) {}
