import { Effect, Option } from "effect"
import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { JwtService } from "../../JwtService"
import { CurrentUser, CurrentUserData } from "../../../domain/CurrentUser"
import { InvalidTokenError } from "../../../domain/UserErrors"

const extractBearerToken = (authHeader: string | undefined): Option.Option<string> => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Option.none()
  }
  return Option.some(authHeader.slice(7))
}

export const authMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const jwtService = yield* JwtService

    const authHeader = request.headers["authorization"]
    const tokenOption = extractBearerToken(authHeader)

    if (Option.isNone(tokenOption)) {
      // No token provided, continue without user context
      return yield* app
    }

    const token = tokenOption.value

    // Verify the token
    const payloadResult = yield* Effect.either(jwtService.verifyAccessToken(token))

    if (payloadResult._tag === "Left") {
      // Invalid token, continue without user context
      // Route handlers can use requireAuth to enforce authentication
      return yield* app
    }

    const payload = payloadResult.right
    const currentUser: CurrentUserData = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    // Provide user context to the app
    return yield* Effect.provide(app, CurrentUser.layer(currentUser))
  })
)

export const requireAuthMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const jwtService = yield* JwtService

    const authHeader = request.headers["authorization"]
    const tokenOption = extractBearerToken(authHeader)

    if (Option.isNone(tokenOption)) {
      return yield* HttpServerResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const token = tokenOption.value

    const payloadResult = yield* Effect.either(jwtService.verifyAccessToken(token))

    if (payloadResult._tag === "Left") {
      const error = payloadResult.left
      return yield* HttpServerResponse.json(
        {
          error: error.message,
          code: "INVALID_TOKEN",
          reason: error.reason,
        },
        { status: 401 }
      )
    }

    const payload = payloadResult.right
    const currentUser: CurrentUserData = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    return yield* Effect.provide(app, CurrentUser.layer(currentUser))
  })
)

export const requireAdminMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const jwtService = yield* JwtService

    const authHeader = request.headers["authorization"]
    const tokenOption = extractBearerToken(authHeader)

    if (Option.isNone(tokenOption)) {
      return yield* HttpServerResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const token = tokenOption.value

    const payloadResult = yield* Effect.either(jwtService.verifyAccessToken(token))

    if (payloadResult._tag === "Left") {
      const error = payloadResult.left
      return yield* HttpServerResponse.json(
        {
          error: error.message,
          code: "INVALID_TOKEN",
          reason: error.reason,
        },
        { status: 401 }
      )
    }

    const payload = payloadResult.right

    if (payload.role !== "admin") {
      return yield* HttpServerResponse.json(
        { error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      )
    }

    const currentUser: CurrentUserData = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    return yield* Effect.provide(app, CurrentUser.layer(currentUser))
  })
)

export const withOptionalAuth = <A, E, R>(
  handler: Effect.Effect<A, E, R | CurrentUser>
): Effect.Effect<A, E | InvalidTokenError, R | JwtService | HttpServerRequest.HttpServerRequest> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const jwtService = yield* JwtService

    const authHeader = request.headers["authorization"]
    const tokenOption = extractBearerToken(authHeader)

    if (Option.isNone(tokenOption)) {
      // No auth, run handler without user context (will fail if handler requires CurrentUser)
      return yield* handler as Effect.Effect<A, E, Exclude<R, CurrentUser>>
    }

    const token = tokenOption.value
    const payload = yield* jwtService.verifyAccessToken(token)

    const currentUser: CurrentUserData = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    return yield* Effect.provide(handler, CurrentUser.layer(currentUser))
  })
