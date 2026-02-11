import { Effect } from 'effect'
import { CurrentUser, CurrentUserData } from '../../domain/CurrentUser'
import { UserRole } from '../../domain/User'
import { ForbiddenError, UnauthorizedError } from '../../domain/UserErrors'

export const requireAuth = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | UnauthorizedError, R | CurrentUser> =>
  Effect.gen(function* () {
    const userOption = yield* CurrentUser.getOption
    if (userOption._tag === 'None') {
      return yield* Effect.fail(UnauthorizedError.make())
    }
    return yield* effect
  })

export const requireRole =
  (role: UserRole) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | UnauthorizedError | ForbiddenError, R | CurrentUser> =>
    Effect.gen(function* () {
      const userOption = yield* CurrentUser.getOption
      if (userOption._tag === 'None') {
        return yield* Effect.fail(UnauthorizedError.make())
      }
      const user = userOption.value
      if (user.role !== role) {
        return yield* Effect.fail(ForbiddenError.requiresRole(role))
      }
      return yield* effect
    })

export const requireAdmin = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | UnauthorizedError | ForbiddenError, R | CurrentUser> =>
  requireRole('admin')(effect)

export const requireStaff = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | UnauthorizedError | ForbiddenError, R | CurrentUser> =>
  requireRole('staff')(effect)

export const requireAnyRole =
  (roles: readonly UserRole[]) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | UnauthorizedError | ForbiddenError, R | CurrentUser> =>
    Effect.gen(function* () {
      const userOption = yield* CurrentUser.getOption
      if (userOption._tag === 'None') {
        return yield* Effect.fail(UnauthorizedError.make())
      }
      const user = userOption.value
      if (!roles.includes(user.role)) {
        return yield* Effect.fail(
          ForbiddenError.make(`Access denied. Required roles: ${roles.join(' or ')}`)
        )
      }
      return yield* effect
    })

export const getCurrentUser = Effect.gen(function* () {
  const userOption = yield* CurrentUser.getOption
  if (userOption._tag === 'None') {
    return yield* Effect.fail(UnauthorizedError.make())
  }
  return userOption.value
})

export const withUser = <A, E, R>(
  user: CurrentUserData,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, Exclude<R, CurrentUser>> => Effect.provide(effect, CurrentUser.layer(user))
