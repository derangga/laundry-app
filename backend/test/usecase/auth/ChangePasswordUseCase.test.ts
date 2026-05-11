import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  ChangePasswordUseCase,
  changePasswordUseCaseImpl,
} from 'src/usecase/auth/ChangePasswordUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { CurrentUser, CurrentUserData } from '@domain/CurrentUser'
import { UserId, UserRole } from '@domain/User'

const testUser: CurrentUserData = {
  id: 'user-123' as UserId,
  email: 'test@example.com',
  role: 'admin' as UserRole,
}

const testUserWithPassword = {
  id: 'user-123' as UserId,
  email: 'test@example.com',
  password_hash: 'hashed-current-password',
  name: 'Test User',
  role: 'admin' as UserRole,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  deleted_at: undefined,
}

let updatedPasswordHash: string | undefined

const createMockUserRepo = (user: typeof testUserWithPassword | null) =>
  Layer.succeed(UserRepository, {
    findByIdWithPassword: (_id: UserId) =>
      Effect.succeed(user ? Option.some(user) : Option.none()),
    update: (_id: UserId, data: { password_hash?: string }) => {
      updatedPasswordHash = data.password_hash
      return Effect.succeed(
        user
          ? Option.some({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              created_at: user.created_at,
              updated_at: new Date(),
            })
          : Option.none()
      )
    },
  } as unknown as UserRepository)

const createMockPasswordService = (isValid: boolean) =>
  Layer.succeed(PasswordService, {
    hash: (_pw: string) => Effect.succeed('hashed-new-password'),
    verify: (_pw: string, _hash: string) => Effect.succeed(isValid),
  } as unknown as PasswordService)

const createTestLayer = (opts: {
  user?: typeof testUserWithPassword | null
  passwordValid?: boolean
}) =>
  Layer.effect(
    ChangePasswordUseCase,
    Effect.map(changePasswordUseCaseImpl, (impl) => new ChangePasswordUseCase(impl))
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        createMockUserRepo('user' in opts ? opts.user ?? null : testUserWithPassword),
        createMockPasswordService(opts.passwordValid ?? true)
      )
    )
  )

describe('ChangePasswordUseCase', () => {
  it('should change password successfully with valid credentials', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* ChangePasswordUseCase
      return yield* useCase.execute({
        currentPassword: 'current-password-123',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      })
    })

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.provide(program, createTestLayer({})),
        CurrentUser.layer(testUser)
      )
    )

    expect(result.success).toBe(true)
    expect(result.message).toBe('Password changed successfully')
    expect(updatedPasswordHash).toBe('hashed-new-password')
  })

  it('should fail with invalid current password', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* ChangePasswordUseCase
      return yield* useCase.execute({
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(
        Effect.provide(program, createTestLayer({ passwordValid: false })),
        CurrentUser.layer(testUser)
      )
    )

    expect(result._tag).toBe('Failure')
  })

  it('should fail when newPassword !== confirmPassword', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* ChangePasswordUseCase
      return yield* useCase.execute({
        currentPassword: 'current-password-123',
        newPassword: 'new-password-123',
        confirmPassword: 'different-password-123',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(
        Effect.provide(program, createTestLayer({})),
        CurrentUser.layer(testUser)
      )
    )

    expect(result._tag).toBe('Failure')
  })

  it('should fail when user is not found', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* ChangePasswordUseCase
      return yield* useCase.execute({
        currentPassword: 'current-password-123',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(
        Effect.provide(program, createTestLayer({ user: null })),
        CurrentUser.layer(testUser)
      )
    )

    expect(result._tag).toBe('Failure')
  })
})
