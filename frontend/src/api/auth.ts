/**
 * Auth API functions and TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { LoginInput } from '@laundry-app/shared'
import {
  AuthResponse,
  AuthenticatedUser,
  LogoutResult,
} from '@laundry-app/shared'

import { api, ApiError } from '@/lib/api-client'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from '@/lib/auth'

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

export async function refreshFn(refreshToken: string): Promise<AuthResponse> {
  return api.post('/api/auth/refresh', { refreshToken }, AuthResponse)
}

export async function logoutFn(refreshToken: string): Promise<LogoutResult> {
  return api.post('/api/auth/logout', { refreshToken }, LogoutResult)
}

export async function getMeFn(): Promise<AuthenticatedUser> {
  return api.get('/api/auth/me', AuthenticatedUser)
}

/**
 * TanStack Query Hooks
 */

/**
 * Get current authenticated user
 * Only fetches if access token exists
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: getMeFn,
    staleTime: Infinity,
    retry: false,
    enabled: !!getAccessToken(),
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
      // Store tokens
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)

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
 * Logout mutation
 * Clears tokens and user data
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token')
      }
      return logoutFn(refreshToken)
    },
    onSettled: () => {
      // Clear tokens and user data (runs even on error)
      clearTokens()
      queryClient.removeQueries({ queryKey: authKeys.user })

      // Navigate to login
      navigate({ to: '/login' })
    },
  })
}
