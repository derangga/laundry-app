import { Effect, Option } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { User, UserId } from '../../../domain/User'

export class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findByEmail = (email: string): Effect.Effect<Option.Option<User>, SqlError.SqlError> =>
      sql<User>`SELECT * FROM users WHERE email = ${email}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const findById = (id: UserId): Effect.Effect<Option.Option<User>, SqlError.SqlError> =>
      sql<User>`SELECT * FROM users WHERE id = ${id}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const insert = (user: typeof User.insert.Type): Effect.Effect<User, SqlError.SqlError> =>
      sql<User>`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (${user.email}, ${user.password_hash}, ${user.name}, ${user.role})
        RETURNING *
      `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? Effect.succeed(first)
            : Effect.fail(
                new SqlError.SqlError({ cause: new Error('Insert failed - no row returned') })
              )
        })
      )

    const update = (
      id: UserId,
      data: Partial<{ email: string; password_hash: string; name: string; role: string }>
    ): Effect.Effect<Option.Option<User>, SqlError.SqlError> => {
      const updates: string[] = []
      const params: Array<string | UserId> = []
      let paramIndex = 1

      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`)
        params.push(data.email)
      }
      if (data.password_hash !== undefined) {
        updates.push(`password_hash = $${paramIndex++}`)
        params.push(data.password_hash)
      }
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.role !== undefined) {
        updates.push(`role = $${paramIndex++}`)
        params.push(data.role)
      }

      if (updates.length === 0) {
        return findById(id)
      }

      updates.push(`updated_at = NOW()`)
      params.push(id)

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`

      return sql.unsafe<User>(query, params).pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )
    }

    const deleteById = (id: UserId): Effect.Effect<boolean, SqlError.SqlError> =>
      sql`DELETE FROM users WHERE id = ${id}`.pipe(Effect.map(() => true))

    return {
      findByEmail,
      findById,
      insert,
      update,
      delete: deleteById,
    } as const
  }),
}) {}
