import { Data } from 'effect'

export class PasswordError extends Data.TaggedError('PasswordError')<{
  message: string
}> {}
