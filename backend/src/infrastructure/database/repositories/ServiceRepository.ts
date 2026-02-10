import { Effect, Option } from "effect"
import { SqlClient, SqlError } from "@effect/sql"
import {
  LaundryService,
  ServiceId,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  UnitType,
} from "../../../domain/LaundryService"

export class ServiceRepository extends Effect.Service<ServiceRepository>()(
  "ServiceRepository",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findById = (
        id: ServiceId
      ): Effect.Effect<Option.Option<LaundryService>, SqlError.SqlError> =>
        sql<LaundryService>`SELECT * FROM services WHERE id = ${id}`.pipe(
          Effect.map((rows) => {
            const first = rows[0]
            return first !== undefined ? Option.some(first) : Option.none()
          })
        )

      const findActive = (): Effect.Effect<
        readonly LaundryService[],
        SqlError.SqlError
      > =>
        sql<LaundryService>`
          SELECT * FROM services
          WHERE is_active = true
          ORDER BY name ASC
        `.pipe(Effect.map((rows) => rows))

      const findAll = (): Effect.Effect<
        readonly LaundryService[],
        SqlError.SqlError
      > =>
        sql<LaundryService>`
          SELECT * FROM services
          ORDER BY name ASC
        `.pipe(Effect.map((rows) => rows))

      const insert = (
        data: CreateLaundryServiceInput
      ): Effect.Effect<LaundryService, SqlError.SqlError> =>
        sql<LaundryService>`
          INSERT INTO services (name, price, unit_type, is_active)
          VALUES (${data.name}, ${data.price}, ${data.unit_type}, true)
          RETURNING *
        `.pipe(
          Effect.flatMap((rows) => {
            const first = rows[0]
            return first !== undefined
              ? Effect.succeed(first)
              : Effect.fail(
                  new SqlError.SqlError({
                    cause: new Error("Insert failed - no row returned"),
                  })
                )
          })
        )

      const update = (
        id: ServiceId,
        data: UpdateLaundryServiceInput
      ): Effect.Effect<Option.Option<LaundryService>, SqlError.SqlError> => {
        const updates: string[] = []
        const params: Array<string | number | boolean | ServiceId> = []
        let paramIndex = 1

        if (data.name !== undefined) {
          updates.push(`name = $${paramIndex++}`)
          params.push(data.name)
        }
        if (data.price !== undefined) {
          updates.push(`price = $${paramIndex++}`)
          params.push(data.price)
        }
        if (data.unit_type !== undefined) {
          updates.push(`unit_type = $${paramIndex++}`)
          params.push(data.unit_type as UnitType)
        }
        if (data.is_active !== undefined) {
          updates.push(`is_active = $${paramIndex++}`)
          params.push(data.is_active)
        }

        if (updates.length === 0) {
          return findById(id)
        }

        updates.push(`updated_at = NOW()`)
        params.push(id)

        const query = `UPDATE services SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`

        return sql.unsafe<LaundryService>(query, params).pipe(
          Effect.map((rows) => {
            const first = rows[0]
            return first !== undefined ? Option.some(first) : Option.none()
          })
        )
      }

      const softDelete = (
        id: ServiceId
      ): Effect.Effect<void, SqlError.SqlError> =>
        sql`
          UPDATE services
          SET is_active = false, updated_at = NOW()
          WHERE id = ${id}
        `.pipe(Effect.map(() => void 0))

      return {
        findById,
        findActive,
        findAll,
        insert,
        update,
        softDelete,
      } as const
    }),
  }
) {}
