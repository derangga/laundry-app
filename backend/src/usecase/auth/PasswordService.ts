import { Effect } from 'effect'
import { hash, verify } from '@node-rs/bcrypt'
import { BcryptConfig } from '../../configs/env'
import { PasswordError } from '@domain/AuthError'

export class PasswordService extends Effect.Service<PasswordService>()('PasswordService', {
  effect: Effect.gen(function* () {
    const config = yield* BcryptConfig

    const hashPassword = (password: string): Effect.Effect<string, PasswordError> =>
      Effect.tryPromise({
        try: () => hash(password, config.saltRounds),
        catch: (error) => new PasswordError({ message: `Failed to hash password: ${error}` }),
      })

    const verifyPassword = (
      password: string,
      hashedPassword: string
    ): Effect.Effect<boolean, PasswordError> =>
      Effect.tryPromise({
        try: () => verify(password, hashedPassword),
        catch: (error) => new PasswordError({ message: `Failed to verify password: ${error}` }),
      })

    return {
      hash: hashPassword,
      verify: verifyPassword,
    } as const
  }),
}) {}

export const PasswordServiceLive = PasswordService.Default
