import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireStaff,
  requireAnyRole,
  getCurrentUser,
  withUser,
} from 'src/usecase/auth/AuthorizationGuards'
import { CurrentUser, CurrentUserData } from '@domain/CurrentUser'
import { UserId, UserRole } from '@domain/User'

describe('AuthorizationGuards', () => {
  const adminUser: CurrentUserData = {
    id: 'admin-123' as UserId,
    email: 'admin@example.com',
    role: 'admin' as UserRole,
  }

  const staffUser: CurrentUserData = {
    id: 'staff-456' as UserId,
    email: 'staff@example.com',
    role: 'staff' as UserRole,
  }

  describe('requireAuth', () => {
    it('should allow authenticated users', async () => {
      const effect = requireAuth(Effect.succeed('success'))
      const program = Effect.provide(effect, CurrentUser.layer(adminUser))

      const result = await Effect.runPromise(program)
      expect(result).toBe('success')
    })

    it('should reject unauthenticated users', async () => {
      const effect = requireAuth(Effect.succeed('success'))
      // Cast to handle the missing CurrentUser context for testing
      const result = await Effect.runPromiseExit(effect as Effect.Effect<string, unknown, never>)
      expect(result._tag).toBe('Failure')
    })
  })

  describe('requireRole', () => {
    it('should allow users with matching role', async () => {
      const effect = requireRole('admin')(Effect.succeed('admin-only'))
      const program = Effect.provide(effect, CurrentUser.layer(adminUser))

      const result = await Effect.runPromise(program)
      expect(result).toBe('admin-only')
    })

    it('should reject users with non-matching role', async () => {
      const effect = requireRole('admin')(Effect.succeed('admin-only'))
      const program = Effect.provide(effect, CurrentUser.layer(staffUser))

      const result = await Effect.runPromiseExit(program)
      expect(result._tag).toBe('Failure')
    })
  })

  describe('requireAdmin', () => {
    it('should allow admin users', async () => {
      const effect = requireAdmin(Effect.succeed('admin-content'))
      const program = Effect.provide(effect, CurrentUser.layer(adminUser))

      const result = await Effect.runPromise(program)
      expect(result).toBe('admin-content')
    })

    it('should reject staff users', async () => {
      const effect = requireAdmin(Effect.succeed('admin-content'))
      const program = Effect.provide(effect, CurrentUser.layer(staffUser))

      const result = await Effect.runPromiseExit(program)
      expect(result._tag).toBe('Failure')
    })
  })

  describe('requireStaff', () => {
    it('should allow staff users', async () => {
      const effect = requireStaff(Effect.succeed('staff-content'))
      const program = Effect.provide(effect, CurrentUser.layer(staffUser))

      const result = await Effect.runPromise(program)
      expect(result).toBe('staff-content')
    })

    it('should reject admin users', async () => {
      const effect = requireStaff(Effect.succeed('staff-content'))
      const program = Effect.provide(effect, CurrentUser.layer(adminUser))

      const result = await Effect.runPromiseExit(program)
      expect(result._tag).toBe('Failure')
    })
  })

  describe('requireAnyRole', () => {
    it('should allow users with any of the specified roles', async () => {
      const effect = requireAnyRole(['admin', 'staff'])(Effect.succeed('allowed'))
      const program = Effect.provide(effect, CurrentUser.layer(staffUser))

      const result = await Effect.runPromise(program)
      expect(result).toBe('allowed')
    })

    it('should reject users without any of the specified roles', async () => {
      // This test would need a third role to properly test,
      // but with only admin/staff, we test with empty roles array behavior
      const effect = requireAnyRole([])(Effect.succeed('allowed'))
      const program = Effect.provide(effect, CurrentUser.layer(staffUser))

      const result = await Effect.runPromiseExit(program)
      expect(result._tag).toBe('Failure')
    })
  })

  describe('getCurrentUser', () => {
    it('should return the current user when authenticated', async () => {
      const program = Effect.provide(getCurrentUser, CurrentUser.layer(adminUser))

      const result = await Effect.runPromise(program)
      expect(result).toEqual(adminUser)
    })

    it('should fail when not authenticated', async () => {
      const result = await Effect.runPromiseExit(
        getCurrentUser as Effect.Effect<CurrentUserData, unknown, never>
      )
      expect(result._tag).toBe('Failure')
    })
  })

  describe('withUser', () => {
    it('should provide user context to the effect', async () => {
      const effect = Effect.gen(function* () {
        const user = yield* CurrentUser.get
        return user.email
      })

      const program = withUser(adminUser, effect)
      const result = await Effect.runPromise(program)
      expect(result).toBe('admin@example.com')
    })
  })
})
