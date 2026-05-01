import { describe, it, expect } from 'vitest'
import { DateTime, Effect, Layer, Option } from 'effect'
import { BootstrapUseCase, bootstrapUseCaseImpl } from 'src/usecase/auth/BootstrapUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { User, UserId, UserRole } from '@domain/User'

const MOCK_HASHED_PASSWORD = 'mock-hashed-password'
const MOCK_DATE = DateTime.unsafeMake('2024-01-01T00:00:00Z')

const createdUser: User = {
  id: 'user-001' as UserId,
  email: 'admin@example.com',
  password_hash: MOCK_HASHED_PASSWORD,
  name: 'Admin User',
  role: 'admin' as UserRole,
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
} as unknown as User

const MockPasswordService = Layer.succeed(PasswordService, {
  hash: (_password: string) => Effect.succeed(MOCK_HASHED_PASSWORD),
  verify: (_password: string, _hash: string) => Effect.succeed(true),
} as unknown as PasswordService)

const createMockUserRepo = (opts: { hasUsers?: boolean; emailExists?: boolean }) =>
  Layer.succeed(UserRepository, {
    findByEmail: (_email: string) =>
      Effect.succeed(opts.emailExists ? Option.some(createdUser) : Option.none()),
    findById: (_id: UserId) => Effect.succeed(Option.none()),
    insert: (_user: typeof User.insert.Type) => Effect.succeed(createdUser),
    update: (_id: UserId, _data: unknown) => Effect.succeed(Option.none()),
    delete: (_id: UserId) => Effect.succeed(true),
    hasAnyUsers: () => Effect.succeed(opts.hasUsers ?? false),
  } as unknown as UserRepository)

const createTestLayer = (opts: { hasUsers?: boolean; emailExists?: boolean } = {}) =>
  Layer.effect(BootstrapUseCase, Effect.map(bootstrapUseCaseImpl, (impl) => new BootstrapUseCase(impl))).pipe(
    Layer.provide(Layer.mergeAll(createMockUserRepo(opts), MockPasswordService))
  )

describe('BootstrapUseCase', () => {
  it('should bootstrap first admin user successfully', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* BootstrapUseCase
      return yield* useCase.execute({
        email: 'admin@example.com',
        password: 'admin-password',
        name: 'Admin User',
      })
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer())
    )

    expect(result.id).toBe(createdUser.id)
    expect(result.email).toBe('admin@example.com')
    expect(result.name).toBe('Admin User')
    expect(result.role).toBe('admin')
  })

  it('should fail when users already exist', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* BootstrapUseCase
      return yield* useCase.execute({
        email: 'admin@example.com',
        password: 'admin-password',
        name: 'Admin User',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ hasUsers: true }))
    )

    expect(result._tag).toBe('Failure')
  })

  it('should fail when email already exists', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* BootstrapUseCase
      return yield* useCase.execute({
        email: 'admin@example.com',
        password: 'admin-password',
        name: 'Admin User',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ emailExists: true }))
    )

    expect(result._tag).toBe('Failure')
  })
})
