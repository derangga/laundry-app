import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Schema } from 'effect'
import { UserWithoutPassword, UpdateUserInput } from '@laundry-app/shared'
import { api, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

export const userKeys = {
  all: ['users'],
  list: () => ['users', 'list'],
}

export async function getUsersFn(): Promise<UserWithoutPassword[]> {
  return api.get('/api/users', Schema.Array(UserWithoutPassword))
}

export async function updateUserFn(
  id: string,
  input: UpdateUserInput,
): Promise<UserWithoutPassword> {
  return api.put(`/api/users/${id}`, input, UserWithoutPassword)
}

export async function deleteUserFn(id: string): Promise<UserWithoutPassword> {
  return api.del(`/api/users/${id}`, UserWithoutPassword)
}

export function useUsers() {
  return useQuery({ queryKey: userKeys.list(), queryFn: getUsersFn })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUserFn(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
      toast.success(`${data.name} has been updated successfully.`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('A user with this email already exists.')
      } else {
        toast.error('Failed to update user. Please try again.')
      }
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUserFn(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
      toast.success(`${data.name} has been removed.`)
    },
    onError: () => {
      toast.error('Failed to delete user. Please try again.')
    },
  })
}
