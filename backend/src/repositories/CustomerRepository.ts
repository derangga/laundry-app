import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  Customer,
  CustomerId,
  CustomerFromDb,
  CustomerSummary,
  UpdateCustomerInput,
} from '../domain/Customer'

export class CustomerRepository extends Effect.Service<CustomerRepository>()('CustomerRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(Customer, {
      tableName: 'customers',
      spanPrefix: 'CustomerRepository',
      idColumn: 'id',
    })

    const decodeCustomer = Schema.decodeUnknown(CustomerFromDb)
    const decodeCustomers = Schema.decodeUnknown(Schema.Array(CustomerFromDb))

    // Custom findById using raw SQL (Model.makeRepository has issues)
    const findById = (
      id: CustomerId
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE id = ${id}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    // Custom methods with explicit columns
    const findByPhone = (
      phone: string
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE phone = ${phone}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const searchByName = (
      name: string
    ): Effect.Effect<readonly (typeof CustomerFromDb.Type)[], SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE name ILIKE ${'%' + name + '%'}
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) => decodeCustomers(rows).pipe(Effect.orDie)),
        Effect.map((rows) => Array.from(rows))
      )

    const findSummaries = (): Effect.Effect<readonly CustomerSummary[], SqlError.SqlError> =>
      sql<CustomerSummary>`
        SELECT id, name, phone
        FROM customers
        ORDER BY name ASC
      `.pipe(Effect.map((rows) => rows))

    const update = (
      id: CustomerId,
      data: UpdateCustomerInput
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> => {
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
        return findById(id)
      }

      updates.push(`updated_at = NOW()`)
      params.push(id)

      const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, phone, address, created_at, updated_at`

      return sql.unsafe(query, params).pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )
    }

    return {
      // Base CRUD from makeRepository
      insert: repo.insert,
      delete: repo.delete,

      // Custom methods using raw SQL (Model.makeRepository has issues)
      findById,

      // Custom query methods
      update,
      findByPhone,
      searchByName,
      findSummaries,
    } as const
  }),
}) {}
