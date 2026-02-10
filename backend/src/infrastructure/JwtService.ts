import { Effect, Config, Duration } from "effect"
import * as jose from "jose"
import { UserId, UserRole } from "../domain/User"
import { InvalidTokenError } from "../domain/UserErrors"

export interface JwtPayload {
  readonly sub: UserId
  readonly email: string
  readonly role: UserRole
}

export interface TokenPair {
  readonly accessToken: string
  readonly refreshToken: string
}

const JwtConfig = Config.all({
  secret: Config.string("JWT_SECRET").pipe(Config.withDefault("your-super-secret-jwt-key-min-32-chars!!")),
  accessExpiry: Config.string("JWT_ACCESS_EXPIRY").pipe(Config.withDefault("15m")),
  refreshExpiry: Config.string("JWT_REFRESH_EXPIRY").pipe(Config.withDefault("7d")),
})

const parseExpiry = (expiry: string): Duration.Duration => {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match || match[1] === undefined || match[2] === undefined) {
    return Duration.minutes(15)
  }
  const value = parseInt(match[1], 10)
  const unit = match[2]
  switch (unit) {
    case "s":
      return Duration.seconds(value)
    case "m":
      return Duration.minutes(value)
    case "h":
      return Duration.hours(value)
    case "d":
      return Duration.days(value)
    default:
      return Duration.minutes(15)
  }
}

export class JwtService extends Effect.Service<JwtService>()("JwtService", {
  effect: Effect.gen(function* () {
    const config = yield* JwtConfig
    const secretKey = new TextEncoder().encode(config.secret)
    const accessExpiry = parseExpiry(config.accessExpiry)
    const refreshExpiry = parseExpiry(config.refreshExpiry)
    // Keep the original expiry strings for jose (it uses formats like "15m", "7d")
    const accessExpiryStr = config.accessExpiry
    const refreshExpiryStr = config.refreshExpiry

    const signAccessToken = (payload: JwtPayload): Effect.Effect<string, Error> =>
      Effect.tryPromise({
        try: async () => {
          const jwt = await new jose.SignJWT({
            email: payload.email,
            role: payload.role,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(payload.sub)
            .setIssuedAt()
            .setExpirationTime(accessExpiryStr)
            .sign(secretKey)
          return jwt
        },
        catch: (error) => new Error(`Failed to sign access token: ${error}`),
      })

    const signRefreshToken = (userId: UserId): Effect.Effect<string, Error> =>
      Effect.tryPromise({
        try: async () => {
          const jwt = await new jose.SignJWT({})
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(userId)
            .setIssuedAt()
            .setExpirationTime(refreshExpiryStr)
            .sign(secretKey)
          return jwt
        },
        catch: (error) => new Error(`Failed to sign refresh token: ${error}`),
      })

    const verifyAccessToken = (token: string): Effect.Effect<JwtPayload, InvalidTokenError> =>
      Effect.tryPromise({
        try: async () => {
          const { payload } = await jose.jwtVerify(token, secretKey)
          return {
            sub: payload.sub as UserId,
            email: payload.email as string,
            role: payload.role as UserRole,
          }
        },
        catch: (error) => {
          if (error instanceof jose.errors.JWTExpired) {
            return InvalidTokenError.expired()
          }
          if (error instanceof jose.errors.JWTInvalid) {
            return InvalidTokenError.invalid()
          }
          return InvalidTokenError.malformed()
        },
      }).pipe(
        Effect.catchAll((error) => Effect.fail(error as InvalidTokenError))
      )

    const verifyRefreshToken = (token: string): Effect.Effect<{ sub: UserId }, InvalidTokenError> =>
      Effect.tryPromise({
        try: async () => {
          const { payload } = await jose.jwtVerify(token, secretKey)
          return {
            sub: payload.sub as UserId,
          }
        },
        catch: (error) => {
          if (error instanceof jose.errors.JWTExpired) {
            return InvalidTokenError.expired()
          }
          if (error instanceof jose.errors.JWTInvalid) {
            return InvalidTokenError.invalid()
          }
          return InvalidTokenError.malformed()
        },
      }).pipe(
        Effect.catchAll((error) => Effect.fail(error as InvalidTokenError))
      )

    const getRefreshExpiryDate = (): Date => {
      const now = new Date()
      return new Date(now.getTime() + Duration.toMillis(refreshExpiry))
    }

    return {
      signAccessToken,
      signRefreshToken,
      verifyAccessToken,
      verifyRefreshToken,
      getRefreshExpiryDate,
      accessExpiry,
      refreshExpiry,
    } as const
  }),
}) {}

export const JwtServiceLive = JwtService.Default
