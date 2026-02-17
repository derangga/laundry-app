import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option } from 'effect'
import { AppApi } from '@api/AppApi'
import { LoginUseCase } from 'src/usecase/auth/LoginUseCase'
import { RefreshTokenUseCase } from 'src/usecase/auth/RefreshTokenUseCase'
import { LogoutUseCase } from 'src/usecase/auth/LogoutUseCase'
import { RegisterUserUseCase } from 'src/usecase/auth/RegisterUserUseCase'
import { BootstrapUseCase } from 'src/usecase/auth/BootstrapUseCase'
import { extractRefreshTokenFromCookie } from '@http/CookieHelper'
import {
  InvalidCredentials,
  Unauthorized,
  ValidationError,
  BootstrapNotAllowed,
  UserAlreadyExists,
} from '@domain/http/HttpErrors'

/**
 * Auth API Handlers
 *
 * Implements handlers for authentication endpoints using HttpApiBuilder.
 * Automatically validates payloads and handles errors.
 *
 * Note: Cookies are managed by the client using the tokens returned in the response body.
 * Handlers return data only; HttpApiBuilder handles response construction.
 *
 * Error mapping pattern:
 * - Domain errors are caught and mapped to HTTP errors with status codes
 * - Each error type is handled separately with appropriate messages
 */
export const AuthHandlersLive = HttpApiBuilder.group(AppApi, 'Auth', (handlers) =>
  handlers
    /**
     * Login with email and password
     * POST /api/auth/login
     * Payload: LoginInput (automatically validated)
     * Returns: AuthResponse (with accessToken, refreshToken, and user data)
     * Errors: 400 (validation), 401 (invalid credentials)
     *
     * Note: Client should store tokens (accessToken in memory/sessionStorage,
     * refreshToken in httpOnly cookie if supported)
     */
    .handle('login', ({ payload }) =>
      Effect.gen(function* () {
        const loginUseCase = yield* LoginUseCase

        // Execute login use case and map errors
        return yield* loginUseCase.execute(payload).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              if ((error as any)._tag === 'InvalidCredentialsError') {
                return new InvalidCredentials({
                  message: (error as any).message || 'Invalid credentials',
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Login failed'
            return new ValidationError({
              message,
            })
          })
        )
      })
    )

    /**
     * Refresh access token
     * POST /api/auth/refresh
     * Payload: RefreshTokenInput (or refreshToken from Authorization header)
     * Returns: AuthResponse (with new accessToken and refreshToken)
     * Errors: 400 (validation), 401 (unauthorized)
     *
     * Note: Prefers refreshToken from Authorization header (bearer token)
     * over request body for security
     */
    .handle('refresh', ({ payload }) =>
      Effect.gen(function* () {
        const refreshUseCase = yield* RefreshTokenUseCase
        const request = yield* HttpServerRequest.HttpServerRequest

        // Try to get refresh token from Authorization header first, fall back to payload
        const cookieToken = extractRefreshTokenFromCookie(request)
        const refreshToken = yield* Option.match(cookieToken, {
          onNone: () => Effect.succeed(payload.refreshToken),
          onSome: (token) => Effect.succeed(token),
        })

        // Execute refresh use case and map errors
        return yield* refreshUseCase.execute({ refreshToken }).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'InvalidTokenError' || tag === 'RefreshTokenNotFoundError') {
                return new Unauthorized({
                  message: (error as any).message || 'Invalid or expired token',
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Token refresh failed'
            return new ValidationError({ message })
          })
        )
      })
    )

    /**
     * Logout and revoke refresh token
     * POST /api/auth/logout
     * Protected: Requires valid access token (via AuthMiddleware)
     * Payload: LogoutInput (optional refreshToken and logoutAll flag)
     * Returns: LogoutResult
     * Errors: 401 (unauthorized)
     *
     * Note: CurrentUser is provided by AuthMiddleware and accessed by
     * LogoutUseCase via CurrentUser.getOption internally.
     */
    .handle('logout', ({ payload }) =>
      Effect.gen(function* () {
        const logoutUseCase = yield* LogoutUseCase
        const request = yield* HttpServerRequest.HttpServerRequest

        // Extract refresh token from cookie or payload
        const cookieToken = extractRefreshTokenFromCookie(request)
        const refreshToken = Option.getOrUndefined(cookieToken) || payload.refreshToken

        // Execute logout use case (CurrentUser context provided by middleware)
        return yield* logoutUseCase
          .execute({
            refreshToken,
            logoutAll: payload.logoutAll,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error && typeof error === 'object' && '_tag' in error) {
                const tag = (error as any)._tag
                if (tag === 'RefreshTokenNotFoundError' || tag === 'UnauthorizedError') {
                  return new Unauthorized({
                    message: (error as any).message || 'Invalid refresh token',
                  })
                }
              }
              const message = error instanceof Error ? error.message : 'Logout failed'
              return new ValidationError({ message })
            })
          )
      })
    )

    /**
     * Register new user (create staff/admin account)
     * POST /api/auth/register
     * Protected: Requires valid access token (via AuthMiddleware)
     * Payload: CreateUserInput (automatically validated)
     * Returns: UserWithoutPassword
     * Errors: 400 (validation), 401 (unauthorized), 409 (already exists)
     *
     * Note: Authentication is enforced by AuthMiddleware. Future enhancement
     * could add role-based authorization (e.g., only admins can register users).
     */
    .handle('register', ({ payload }) =>
      Effect.gen(function* () {
        const registerUseCase = yield* RegisterUserUseCase

        // Execute register use case and map errors
        return yield* registerUseCase.execute(payload).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'UserAlreadyExistsError') {
                return new UserAlreadyExists({
                  message: (error as any).message || 'User already exists',
                  email: (error as any).email || '',
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Registration failed'
            return new ValidationError({
              message,
            })
          })
        )
      })
    )

    /**
     * Bootstrap - Create first admin user
     * POST /api/auth/bootstrap
     * Public: No authentication required
     * Payload: BootstrapInput (automatically validated)
     * Returns: UserWithoutPassword
     * Only works when no users exist in database
     * Errors: 400 (validation), 409 (bootstrap not allowed)
     */
    .handle('bootstrap', ({ payload }) =>
      Effect.gen(function* () {
        const bootstrapUseCase = yield* BootstrapUseCase

        // Execute bootstrap use case and map errors
        return yield* bootstrapUseCase.execute(payload).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'BootstrapNotAllowedError') {
                return new BootstrapNotAllowed({
                  message: (error as any).message || 'Bootstrap is not allowed',
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Bootstrap failed'
            return new ValidationError({
              message,
            })
          })
        )
      })
    )
)
