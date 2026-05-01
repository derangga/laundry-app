import { describe, it, expect } from 'vitest'
import { DateTime, Effect, Layer, Option } from 'effect'
import { RegisterUserUseCase, registerUserUseCaseImpl } from 'src/usecase/auth/RegisterUserUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { User, UserId, UserRole } from '@domain/User'

const MOCK_HASHED_PASSWORD = 'mock-hashed-password'
const MOCK_DATE = DateTime.unsafeMake('2024-01-01T00:00:00Z')

const createdUser: User = {
  id: 'user-001' as UserId,
  email: 'new@example.com',
  password_hash: MOCK_HASHED_PASSWORD,
  name: 'New User',
  role: 'staff' as UserRole,
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
} as unknown as User

const MockPasswordService = Layer.succeed(PasswordService, {
  hash: (_password: string) => Effect.succeed(MOCK_HASHED_PASSWORD),
  verify: (_password: string, _hash: string) => Effect.succeed(true),
} as unknown as PasswordService)

const createMockUserRepo = (opts: { emailExists?: boolean }) =>
  Layer.succeed(UserRepository, {
    findByEmail: (_email: string) =>
      Effect.succeed(opts.emailExists ? Option.some(createdUser) : Option.none()),
    findById: (_id: UserId) => Effect.succeed(Option.none()),
    insert: (_user: typeof User.insert.Type) => Effect.succeed(createdUser),
    update: (_id: UserId, _data: unknown) => Effect.succeed(Option.none()),
    delete: (_id: UserId) => Effect.succeed(true),
    hasAnyUsers: () => Effect.succeed(false),
  } as unknown as UserRepository)

const createTestLayer = (opts: { emailExists?: boolean } = {}) =>
  Layer.effect(RegisterUserUseCase, Effect.map(registerUserUseCaseImpl, (impl) => new RegisterUserUseCase(impl))).pipe(
    Layer.provide(Layer.mergeAll(createMockUserRepo(opts), MockPasswordService))
  )

describe('RegisterUserUseCase', () => {
  it('should register a new user successfully', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* RegisterUserUseCase
      return yield* useCase.execute({
        email: 'new@example.com',
        password: 'secure-password',
        name: 'New User',
        role: 'staff' as UserRole,
      })
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer())
    )

    expect(result.id).toBe(createdUser.id)
    expect(result.email).toBe('new@example.com')
    expect(result.name).toBe('New User')
    expect(result.role).toBe('staff')
  })

  it('should fail when email already exists', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* RegisterUserUseCase
      return yield* useCase.execute({
        email: 'new@example.com',
        password: 'secure-password',
        name: 'New User',
        role: 'staff' as UserRole,
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ emailExists: true }))
    )

    expect(result._tag).toBe('Failure')
  })
})
