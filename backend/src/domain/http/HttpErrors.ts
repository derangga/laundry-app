import { HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

/**
 * HTTP Error Schemas
 *
 * Maps domain errors to HTTP errors with appropriate status codes.
 * Used by HttpApiBuilder for automatic error handling and response generation.
 *
 * Pattern:
 * - Domain errors stay in domain layer (Data.TaggedError)
 * - HTTP errors wrap domain errors (Schema.TaggedError)
 * - Handlers map domain errors to HTTP errors using Effect.mapError()
 */

// ============================================================================
// Auth Errors (401, 403)
// ============================================================================

export class InvalidCredentials extends Schema.TaggedError<InvalidCredentials>()(
  'InvalidCredentials',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  'Unauthorized',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  'Forbidden',
  {
    message: Schema.String,
    requiredRole: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

export class BootstrapNotAllowed extends Schema.TaggedError<BootstrapNotAllowed>()(
  'BootstrapNotAllowed',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

// ============================================================================
// Customer Errors (404, 409)
// ============================================================================

export class CustomerNotFound extends Schema.TaggedError<CustomerNotFound>()(
  'CustomerNotFound',
  {
    message: Schema.String,
    phone: Schema.optional(Schema.String),
    customerId: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class CustomerAlreadyExists extends Schema.TaggedError<CustomerAlreadyExists>()(
  'CustomerAlreadyExists',
  {
    message: Schema.String,
    phone: Schema.String,
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

export class InvalidPhoneNumber extends Schema.TaggedError<InvalidPhoneNumber>()(
  'InvalidPhoneNumber',
  {
    message: Schema.String,
    phone: Schema.String,
    reason: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

// ============================================================================
// User Errors (404, 409)
// ============================================================================

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  'UserNotFound',
  {
    message: Schema.String,
    userId: Schema.optional(Schema.String),
    email: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class UserAlreadyExists extends Schema.TaggedError<UserAlreadyExists>()(
  'UserAlreadyExists',
  {
    message: Schema.String,
    email: Schema.String,
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

// ============================================================================
// Token Errors (401)
// ============================================================================

export class InvalidToken extends Schema.TaggedError<InvalidToken>()(
  'InvalidToken',
  {
    message: Schema.String,
    reason: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class RefreshTokenNotFound extends Schema.TaggedError<RefreshTokenNotFound>()(
  'RefreshTokenNotFound',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

// ============================================================================
// Validation Errors (400)
// ============================================================================

export class ValidationError extends Schema.TaggedError<ValidationError>()(
  'ValidationError',
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    details: Schema.optional(Schema.Any),
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class RetrieveDataEror extends Schema.TaggedError<RetrieveDataEror>()(
  'RetrieveDataEror',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 422 })
) {}

export class UpdateDataEror extends Schema.TaggedError<UpdateDataEror>()(
  'UpdateDataEror',
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 422 })
) {}

// ============================================================================
// Server Errors (500)
// ============================================================================

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  'InternalServerError',
  {
    message: Schema.String,
    code: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 500 })
) {}

// ============================================================================
// Error Union Types (for documentation and type safety)
// ============================================================================

export type AuthErrorTypes = InvalidCredentials | Unauthorized | Forbidden | BootstrapNotAllowed

export type CustomerErrorTypes = CustomerNotFound | CustomerAlreadyExists | InvalidPhoneNumber

export type UserErrorTypes = UserNotFound | UserAlreadyExists

export type TokenErrorTypes = InvalidToken | RefreshTokenNotFound

export type ApiErrorTypes =
  | AuthErrorTypes
  | CustomerErrorTypes
  | UserErrorTypes
  | TokenErrorTypes
  | ValidationError
  | InternalServerError

// ============================================================================
// Service Errors (404)
// ============================================================================

export class ServiceNotFound extends Schema.TaggedError<ServiceNotFound>()(
  'ServiceNotFound',
  {
    message: Schema.String,
    serviceId: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 404 })
) {}
