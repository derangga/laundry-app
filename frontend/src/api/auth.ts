/**
 * Auth API functions and TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type {
  LoginInput,
  CreateUserInput,
  ChangePasswordInput,
  AuthResponse,
  AuthenticatedUser,
  LogoutResult,
  UserWithoutPassword,
  ChangePasswordSuccess,
} from '@laundry-app/shared'

import type { ApiClientType, ClientError } from '@/lib/runtime'
import { runClient } from '@/lib/runtime'
import { userKeys } from '@/api/users'

type LoginError = ClientError<ReturnType<ApiClientType['Auth']['login']>>
type RegisterError = ClientError<ReturnType<ApiClientType['Auth']['register']>>
type ChangePasswordError = ClientError<
  ReturnType<ApiClientType['Auth']['changePassword']>
>

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
  return runClient((client) => client.Auth.login({ payload: input }))
}

export async function refreshFn(): Promise<AuthResponse> {
  return runClient((client) => client.Auth.refresh({ payload: {} }))
}

export async function logoutFn(): Promise<LogoutResult> {
  return runClient((client) => client.Auth.logout({ payload: {} }))
}

export async function getMeFn(): Promise<AuthenticatedUser> {
  return runClient((client) => client.Auth.me())
}

export async function registerUserFn(
  input: CreateUserInput,
): Promise<UserWithoutPassword> {
  return runClient((client) => client.Auth.register({ payload: input }))
}

export async function changePasswordFn(
  input: ChangePasswordInput,
): Promise<ChangePasswordSuccess> {
  return runClient((client) => client.Auth.changePassword({ payload: input }))
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

  return useMutation<AuthResponse, LoginError, LoginInput>({
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
      console.error(error)
      switch (error._tag) {
        case 'InvalidCredentials':
        case 'ValidationError':
          toast.error('Wrong email or password')
          break
        default:
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
  return useMutation<UserWithoutPassword, RegisterError, CreateUserInput>({
    mutationFn: registerUserFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
      toast.success(`${data.name} has been registered successfully.`)
    },
    onError: (error) => {
      switch (error._tag) {
        case 'UserAlreadyExists':
          toast.error('A user with this email already exists.')
          break
        default:
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

/**
 * Change password mutation
 */
export function useChangePassword(options?: { onSuccess?: () => void }) {
  return useMutation<
    ChangePasswordSuccess,
    ChangePasswordError,
    ChangePasswordInput
  >({
    mutationFn: changePasswordFn,
    onSuccess: (data) => {
      toast.success(data.message || 'Password changed successfully')
      options?.onSuccess?.()
    },
    onError: (error) => {
      switch (error._tag) {
        case 'InvalidCredentials':
          toast.error('Current password is incorrect')
          break
        case 'ValidationError':
          toast.error(error.message || 'Failed to change password')
          break
        default:
          toast.error('Failed to change password')
      }
    },
  })
}
