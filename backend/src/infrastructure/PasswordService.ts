import { Effect } from 'effect'
import { hash, verify } from '@node-rs/bcrypt'

const SALT_ROUNDS = 12

export class PasswordService extends Effect.Service<PasswordService>()('PasswordService', {
  effect: Effect.gen(function* () {
    const hashPassword = (password: string): Effect.Effect<string, Error> =>
      Effect.tryPromise({
        try: () => hash(password, SALT_ROUNDS),
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
