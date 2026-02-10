import { Data } from "effect"

export class InvalidCredentialsError extends Data.TaggedError("InvalidCredentialsError")<{
  readonly message: string
}> {
  static readonly make = () =>
    new InvalidCredentialsError({ message: "Invalid email or password" })
}

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly message: string
  readonly userId?: string
  readonly email?: string
}> {
  static readonly byId = (userId: string) =>
    new UserNotFoundError({ message: `User not found with id: ${userId}`, userId })

  static readonly byEmail = (email: string) =>
    new UserNotFoundError({ message: `User not found with email: ${email}`, email })
}

export class UserAlreadyExistsError extends Data.TaggedError("UserAlreadyExistsError")<{
  readonly message: string
  readonly email: string
}> {
  static readonly make = (email: string) =>
    new UserAlreadyExistsError({ message: `User already exists with email: ${email}`, email })
}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  readonly message: string
  readonly reason?: string
}> {
  static readonly expired = () =>
    new InvalidTokenError({ message: "Token has expired", reason: "expired" })

  static readonly invalid = () =>
    new InvalidTokenError({ message: "Invalid token", reason: "invalid" })

  static readonly revoked = () =>
    new InvalidTokenError({ message: "Token has been revoked", reason: "revoked" })

  static readonly malformed = () =>
    new InvalidTokenError({ message: "Malformed token", reason: "malformed" })
}

export class RefreshTokenNotFoundError extends Data.TaggedError("RefreshTokenNotFoundError")<{
  readonly message: string
}> {
  static readonly make = () =>
    new RefreshTokenNotFoundError({ message: "Refresh token not found or expired" })
}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string
}> {
  static readonly make = (message = "Authentication required") =>
    new UnauthorizedError({ message })
}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string
  readonly requiredRole?: string
}> {
  static readonly make = (message = "Access denied") => new ForbiddenError({ message })

  static readonly requiresRole = (role: string) =>
    new ForbiddenError({
      message: `Access denied. Required role: ${role}`,
      requiredRole: role,
    })
}

export type AuthError =
  | InvalidCredentialsError
  | UserNotFoundError
  | UserAlreadyExistsError
  | InvalidTokenError
  | RefreshTokenNotFoundError
  | UnauthorizedError
  | ForbiddenError
