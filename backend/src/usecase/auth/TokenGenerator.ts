import { Effect } from 'effect'
import { createHash, randomBytes } from 'crypto'
import { InvalidTokenError } from '@domain/UserErrors'

export class TokenGenerator extends Effect.Service<TokenGenerator>()('TokenGenerator', {
  effect: Effect.gen(function* () {
    const generateToken = (length = 32): Effect.Effect<string, InvalidTokenError> =>
      Effect.try({
        try: () => randomBytes(length).toString('hex'),
        catch: () => new InvalidTokenError({ message: 'Failed to provide token' }),
      })

    const hashToken = (token: string): Effect.Effect<string, never> =>
      Effect.sync(() => createHash('sha256').update(token).digest('hex'))

    const generateAndHash = (
      length = 32
    ): Effect.Effect<{ rawToken: string; hashedToken: string }, InvalidTokenError> =>
      Effect.gen(function* () {
        const rawToken = yield* generateToken(length)
        const hashedToken = yield* hashToken(rawToken)
        return { rawToken, hashedToken }
      })

    return {
      generate: generateToken,
      hash: hashToken,
      generateAndHash,
    } as const
  }),
}) {}

export const TokenGeneratorLive = TokenGenerator.Default
