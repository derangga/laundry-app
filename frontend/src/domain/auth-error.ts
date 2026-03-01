import { Data } from 'effect'

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause?: unknown
}> {}

export class AccessTokenInvalidError extends Data.TaggedError(
  'AccessTokenInvalidError',
)<{
  readonly status: number
}> {}

export class RefreshTokenFailedError extends Data.TaggedError(
  'RefreshTokenFailedError',
)<{
  readonly status: number
}> {}
