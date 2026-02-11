import { Effect, Option } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { RefreshToken, RefreshTokenId } from '../domain/RefreshToken'
import { UserId } from '../domain/User'

export class RefreshTokenRepository extends Effect.Service<RefreshTokenRepository>()(
  'RefreshTokenRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      // Base CRUD from Model.makeRepository
      const repo = yield* Model.makeRepository(RefreshToken, {
        tableName: 'refresh_tokens',
        spanPrefix: 'RefreshTokenRepository',
        idColumn: 'id',
      })

      // Custom methods with explicit columns
      const findByTokenHash = (
        tokenHash: string
      ): Effect.Effect<Option.Option<RefreshToken>, SqlError.SqlError> =>
        sql<RefreshToken>`
          SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
          FROM refresh_tokens
          WHERE token_hash = ${tokenHash}
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

      const insert = (data: {
        user_id: UserId
        token_hash: string
        expires_at: Date
      }): Effect.Effect<RefreshToken, SqlError.SqlError> =>
        sql<RefreshToken>`
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
          VALUES (${data.user_id}, ${data.token_hash}, ${data.expires_at})
          RETURNING id, user_id, token_hash, expires_at, created_at, revoked_at
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

      const revoke = (id: RefreshTokenId): Effect.Effect<boolean, SqlError.SqlError> =>
        sql`
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE id = ${id} AND revoked_at IS NULL
        `.pipe(Effect.map(() => true))

      const revokeByTokenHash = (tokenHash: string): Effect.Effect<boolean, SqlError.SqlError> =>
        sql`
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
        `.pipe(Effect.map(() => true))

      const revokeAllForUser = (userId: UserId): Effect.Effect<number, SqlError.SqlError> =>
        sql`
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE user_id = ${userId} AND revoked_at IS NULL
        `.pipe(Effect.map((result) => result.length))

      const deleteExpired = (): Effect.Effect<number, SqlError.SqlError> =>
        sql`
          DELETE FROM refresh_tokens
          WHERE expires_at < NOW() OR revoked_at IS NOT NULL
        `.pipe(Effect.map((result) => result.length))

      return {
        // Base CRUD from makeRepository
        findById: repo.findById,

        // Custom methods
        insert,
        findByTokenHash,
        revoke,
        revokeByTokenHash,
        revokeAllForUser,
        deleteExpired,
      } as const
    }),
  }
) {}
