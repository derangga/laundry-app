import { Data } from 'effect'

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause?: unknown
}> {}

export class HttpError extends Data.TaggedError('HttpError')<{
  readonly status: number
  readonly code: string
  readonly message: string
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly path: string
  readonly cause?: unknown
}> {}

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  readonly message: string
}> {}

export type ApiClientError =
  | NetworkError
  | HttpError
  | ValidationError
  | UnauthorizedError
