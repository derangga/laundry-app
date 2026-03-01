/**
 * Auth API functions and TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { LoginInput, CreateUserInput } from '@laundry-app/shared'
import {
  AuthResponse,
  AuthenticatedUser,
  LogoutResult,
  UserWithoutPassword,
} from '@laundry-app/shared'

import { api, ApiError } from '@/lib/api-client'
import { userKeys } from '@/api/users'

/**
 * Query keys factory for auth-related queries
 */
export const authKeys = {
  all: ['auth'],
  user: ['auth', 'user'],
}

/**
 * API Functions
 */

export async function loginFn(input: LoginInput): Promise<AuthResponse> {
  return api.post('/api/auth/login', input, AuthResponse)
}

export async function refreshFn(): Promise<AuthResponse> {
  return api.post('/api/auth/refresh', {}, AuthResponse)
}

export async function logoutFn(): Promise<LogoutResult> {
  return api.post('/api/auth/logout', {}, LogoutResult)
}

export async function getMeFn(): Promise<AuthenticatedUser> {
  return api.get('/api/auth/me', AuthenticatedUser)
}

export async function registerUserFn(
  input: CreateUserInput,
): Promise<UserWithoutPassword> {
  return api.post('/api/auth/register', input, UserWithoutPassword)
}

/**
 * TanStack Query Hooks
 */

/**
 * Get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: getMeFn,
    staleTime: Infinity,
    retry: false,
    // Always enabled - let 401 trigger redirect via error boundary
  })
}

/**
 * Login mutation
 * Stores tokens and user data on success
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: loginFn,
    onSuccess: (data) => {
      // Cookies set by backend via Set-Cookie headers

      // Set user in cache
      queryClient.setQueryData(authKeys.user, data.user)

      // Invalidate user query to trigger refetch
      queryClient.invalidateQueries({ queryKey: authKeys.user })

      // Navigate to home
      navigate({ to: '/' })

      // Show success toast
      toast.success(`Welcome back, ${data.user.name}!`)
    },
    onError: (error) => {
      // Check if error has status property (duck typing)
      const isAuthError =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 400)

      if (isAuthError) {
        toast.error('Wrong email or password')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    },
  })
}

/**
 * Register user mutation
 * Admin-only: creates a new staff or admin account
 */
export function useRegisterUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerUserFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
      toast.success(`${data.name} has been registered successfully.`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('A user with this email already exists.')
      } else {
        toast.error('Failed to register user. Please try again.')
      }
    },
  })
}

/**
 * Logout mutation
 * Clears cookies and user data
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logoutFn,
    onSettled: () => {
      // Cookies cleared by backend via Set-Cookie with Max-Age=0
      queryClient.removeQueries({ queryKey: authKeys.user })

      // Navigate to login
      navigate({ to: '/login' })
    },
  })
}
