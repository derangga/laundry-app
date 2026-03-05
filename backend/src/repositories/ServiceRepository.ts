import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  LaundryService,
  ServiceId,
  ActiveServiceInfo,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
} from '../domain/LaundryService'

// Helper to decode SQL results through the schema
const decodeServices = Schema.decodeUnknown(Schema.Array(LaundryService))
const decodeService = Schema.decodeUnknown(LaundryService)
const decodeActiveServiceInfos = Schema.decodeUnknown(Schema.Array(ActiveServiceInfo))

export class ServiceRepository extends Effect.Service<ServiceRepository>()('ServiceRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(LaundryService, {
      tableName: 'services',
      spanPrefix: 'ServiceRepository',
      idColumn: 'id',
    })

    // Custom methods with explicit columns
    const findActive = (): Effect.Effect<readonly LaundryService[], SqlError.SqlError> =>
      sql`
        SELECT id, name, price, unit_type, is_active, created_at, updated_at
        FROM services
        WHERE is_active = true
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) => decodeServices(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const findAll = (): Effect.Effect<readonly LaundryService[], SqlError.SqlError> =>
      sql`
        SELECT id, name, price, unit_type, is_active, created_at, updated_at
        FROM services
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) => decodeServices(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const findActiveServiceInfo = (): Effect.Effect<
      readonly ActiveServiceInfo[],
      SqlError.SqlError
    > =>
      sql`
        SELECT id, name, price, unit_type
        FROM services
        WHERE is_active = true
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) => decodeActiveServiceInfos(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const insert = (
      data: CreateLaundryServiceInput
    ): Effect.Effect<LaundryService, SqlError.SqlError> =>
      sql`
        INSERT INTO services (name, price, unit_type, is_active)
        VALUES (${data.name}, ${data.price}, ${data.unit_type}, true)
        RETURNING id, name, price, unit_type, is_active, created_at, updated_at
      `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeService(first)
            : Effect.fail(new Error('Insert failed - no row returned'))
        }),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const update = (
      id: ServiceId,
      data: UpdateLaundryServiceInput
    ): Effect.Effect<Option.Option<LaundryService>, SqlError.SqlError> => {
      const entries = Object.entries(data).filter(
        (entry): entry is [string, string | number | boolean] => entry[1] !== undefined
      )

      if (entries.length === 0) {
        return repo.findById(id)
      }

      const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`)
      setClauses.push(`updated_at = NOW()`)

      const params = [...entries.map(([, value]) => value), id]

      const query = `UPDATE services SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING id, name, price, unit_type, is_active, created_at, updated_at`

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeService(first).pipe(Effect.map(Option.some))
            : Effect.succeed(Option.none())
        }),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const softDelete = (id: ServiceId): Effect.Effect<void, SqlError.SqlError> =>
      sql`
        UPDATE services
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id}
      `.pipe(Effect.map(() => void 0))

    return {
      // Base CRUD from makeRepository
      findById: repo.findById,

      // Custom methods
      insert,
      update,
      findActive,
      findAll,
      findActiveServiceInfo,
      softDelete,
    } as const
  }),
}) {}
