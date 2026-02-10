import { Context, Effect, Layer } from "effect"
import { UserId, UserRole } from "./User"

export interface CurrentUserData {
  readonly id: UserId
  readonly email: string
  readonly role: UserRole
}

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, CurrentUserData>() {
  static readonly get = Effect.serviceOption(CurrentUser).pipe(
    Effect.flatMap((option) =>
      option._tag === "Some"
        ? Effect.succeed(option.value)
        : Effect.fail(new Error("CurrentUser not available in context"))
    )
  )

  static readonly getOption = Effect.serviceOption(CurrentUser)

  static readonly layer = (user: CurrentUserData): Layer.Layer<CurrentUser> =>
    Layer.succeed(CurrentUser, user)

  static readonly isAdmin = Effect.gen(function* () {
    const user = yield* CurrentUser.get
    return user.role === "admin"
  })

  static readonly isStaff = Effect.gen(function* () {
    const user = yield* CurrentUser.get
    return user.role === "staff"
  })

  static readonly hasRole = (role: UserRole) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser.get
      return user.role === role
    })
}
