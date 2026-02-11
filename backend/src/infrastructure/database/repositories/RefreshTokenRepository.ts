import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { Model } from '@effect/sql'
import { UserId } from '../../../domain/User'

export const RefreshTokenId = Schema.String.pipe(Schema.brand('RefreshTokenId'))
export type RefreshTokenId = typeof RefreshTokenId.Type

export class RefreshToken extends Model.Class<RefreshToken>('RefreshToken')({
  id: Model.Generated(RefreshTokenId),
  user_id: UserId,
  token_hash: Schema.String,
  expires_at: Schema.DateTimeUtc,
  created_at: Model.DateTimeInsert,
  revoked_at: Schema.NullOr(Schema.DateTimeUtc),
}) {}

export class RefreshTokenRepository extends Effect.Service<RefreshTokenRepository>()(
  'RefreshTokenRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findByTokenHash = (
        tokenHash: string
      ): Effect.Effect<Option.Option<RefreshToken>, SqlError.SqlError> =>
        sql<RefreshToken>`
          SELECT * FROM refresh_tokens
          WHERE token_hash = ${tokenHash}
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `.pipe(
          Effect.map((rows) => {
            const first = rows[0]
            return first !== undefined ? Option.some(first) : Option.none()
          })
        )

      const findById = (
        id: RefreshTokenId
      ): Effect.Effect<Option.Option<RefreshToken>, SqlError.SqlError> =>
        sql<RefreshToken>`SELECT * FROM refresh_tokens WHERE id = ${id}`.pipe(
          Effect.map((rows) => {
            const first = rows[0]
            return first !== undefined ? Option.some(first) : Option.none()
          })
        )

      const insert = (data: {
        user_id: UserId
        token_hash: string
        expires_at: Date
      }): Effect.Effect<RefreshToken, SqlError.SqlError> =>
        sql<RefreshToken>`
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
          VALUES (${data.user_id}, ${data.token_hash}, ${data.expires_at})
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
        findByTokenHash,
        findById,
        insert,
        revoke,
        revokeByTokenHash,
        revokeAllForUser,
        deleteExpired,
      } as const
    }),
  }
) {}
