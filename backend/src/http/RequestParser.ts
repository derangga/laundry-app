import { HttpServerRequest } from '@effect/platform'
import { Schema } from '@effect/schema'
import { Effect, Data } from 'effect'

export class ValidationError extends Data.TaggedError('ValidationError')<{
  errors: Array<{ field: string; message: string }>
}> {}

export const parseBody = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const body = yield* request.json

    return yield* Schema.decodeUnknown(schema)(body).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            errors: parseError.message ? [{ field: 'body', message: parseError.message }] : [],
          })
      )
    )
  })

export const parseQuery = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
    const query = Object.fromEntries(url.searchParams)

    return yield* Schema.decodeUnknown(schema)(query).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            errors: parseError.message ? [{ field: 'query', message: parseError.message }] : [],
          })
      )
    )
  })
