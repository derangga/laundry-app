import { Effect } from 'effect'
import { hash, verify } from '@node-rs/bcrypt'
import { BcryptConfig } from '../../configs/env'

export class PasswordService extends Effect.Service<PasswordService>()('PasswordService', {
  effect: Effect.gen(function* () {
    const config = yield* BcryptConfig

    const hashPassword = (password: string): Effect.Effect<string, Error> =>
      Effect.tryPromise({
        try: () => hash(password, config.saltRounds),
        catch: (error) => new Error(`Failed to hash password: ${error}`),
      })

    const verifyPassword = (
      password: string,
      hashedPassword: string
    ): Effect.Effect<boolean, Error> =>
      Effect.tryPromise({
        try: () => verify(password, hashedPassword),
        catch: (error) => new Error(`Failed to verify password: ${error}`),
      })

    return {
      hash: hashPassword,
      verify: verifyPassword,
    } as const
  }),
}) {}

export const PasswordServiceLive = PasswordService.Default
