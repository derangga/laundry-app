import { HttpMiddleware, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { SqlError } from '@effect/sql'
import { ValidationError } from '@http/RequestParser'

// Domain errors
import { CustomerNotFound, CustomerAlreadyExists, InvalidPhoneNumber } from '@domain/CustomerErrors'
import { ServiceNotFound, ServiceAlreadyExists, InvalidServiceUnit } from '@domain/ServiceErrors'
import {
  OrderNotFound,
  InvalidOrderTransition,
  OrderValidationError,
  EmptyOrderError,
  InvalidOrderStatus,
} from '@domain/OrderErrors'
import {
  UnauthorizedError,
  ForbiddenError,
  InvalidCredentialsError,
  InvalidTokenError,
  UserNotFoundError,
  UserAlreadyExistsError,
  RefreshTokenNotFoundError,
} from '@domain/UserErrors'

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export const errorHandlerMiddleware = HttpMiddleware.make((app) =>
  app.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        // Customer errors
        if (error instanceof CustomerNotFound) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'CUSTOMER_NOT_FOUND',
                message: `Customer with phone ${error.phone} not found`,
              },
            } satisfies ErrorResponse,
            { status: 404 }
          )
        }

        if (error instanceof CustomerAlreadyExists) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'CUSTOMER_ALREADY_EXISTS',
                message: `Customer with phone ${error.phone} already exists`,
              },
            } satisfies ErrorResponse,
            { status: 409 }
          )
        }

        if (error instanceof InvalidPhoneNumber) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_PHONE_NUMBER',
                message: error.reason,
                details: { phone: error.phone },
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        // Service errors
        if (error instanceof ServiceNotFound) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'SERVICE_NOT_FOUND',
                message: 'Service not found',
              },
            } satisfies ErrorResponse,
            { status: 404 }
          )
        }

        if (error instanceof ServiceAlreadyExists) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'SERVICE_ALREADY_EXISTS',
                message: `Service '${error.name}' already exists`,
              },
            } satisfies ErrorResponse,
            { status: 409 }
          )
        }

        if (error instanceof InvalidServiceUnit) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_SERVICE_UNIT',
                message: `Invalid unit type: ${error.unitType}`,
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        // Order errors
        if (error instanceof OrderNotFound) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'ORDER_NOT_FOUND',
                message: 'Order not found',
              },
            } satisfies ErrorResponse,
            { status: 404 }
          )
        }

        if (error instanceof InvalidOrderTransition) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_ORDER_TRANSITION',
                message: `Cannot transition from ${error.from} to ${error.to}`,
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        if (error instanceof InvalidOrderStatus) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_ORDER_STATUS',
                message: error.reason,
                details: {
                  currentStatus: error.currentStatus,
                  attemptedStatus: error.attemptedStatus,
                },
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        if (error instanceof OrderValidationError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'ORDER_VALIDATION_ERROR',
                message: 'Order validation failed',
                details: { errors: error.errors },
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        if (error instanceof EmptyOrderError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'EMPTY_ORDER',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        // Validation errors
        if (error instanceof ValidationError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: { errors: error.errors },
              },
            } satisfies ErrorResponse,
            { status: 400 }
          )
        }

        // Auth errors
        if (error instanceof UnauthorizedError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'UNAUTHORIZED',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 401 }
          )
        }

        if (error instanceof ForbiddenError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: error.message,
                details: error.requiredRole ? { requiredRole: error.requiredRole } : undefined,
              },
            } satisfies ErrorResponse,
            { status: 403 }
          )
        }

        if (error instanceof InvalidCredentialsError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_CREDENTIALS',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 401 }
          )
        }

        if (error instanceof InvalidTokenError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INVALID_TOKEN',
                message: error.message,
                details: error.reason ? { reason: error.reason } : undefined,
              },
            } satisfies ErrorResponse,
            { status: 401 }
          )
        }

        if (error instanceof UserNotFoundError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'USER_NOT_FOUND',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 404 }
          )
        }

        if (error instanceof UserAlreadyExistsError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'USER_ALREADY_EXISTS',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 409 }
          )
        }

        if (error instanceof RefreshTokenNotFoundError) {
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'REFRESH_TOKEN_NOT_FOUND',
                message: error.message,
              },
            } satisfies ErrorResponse,
            { status: 401 }
          )
        }

        // Database errors
        if (error instanceof SqlError.SqlError) {
          yield* Effect.logError('Database error:', error)
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'DATABASE_ERROR',
                message: 'A database error occurred',
              },
            } satisfies ErrorResponse,
            { status: 500 }
          )
        }

        // Unexpected errors
        yield* Effect.logError('Unexpected error:', error)
        return yield* HttpServerResponse.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          } satisfies ErrorResponse,
          { status: 500 }
        )
      })
    )
  )
)
