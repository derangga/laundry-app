import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateUserInput, UserWithoutPassword } from '@laundry-app/shared'
import { toast } from 'sonner'

import type { ApiClientType, ClientError } from '@/lib/runtime'
import { runClient } from '@/lib/runtime'

type UpdateUserError = ClientError<
  ReturnType<ApiClientType['Users']['updateUser']>
>

export const userKeys = {
  all: ['users'],
  list: () => ['users', 'list'],
}

export async function getUsersFn(): Promise<UserWithoutPassword[]> {
  const result = await runClient((client) => client.Users.listUsers())
  return [...result]
}

export async function updateUserFn(
  id: string,
  input: UpdateUserInput,
): Promise<UserWithoutPassword> {
  return runClient((client) =>
    client.Users.updateUser({ path: { id }, payload: input }),
  )
}

export async function deleteUserFn(id: string): Promise<UserWithoutPassword> {
  return runClient((client) => client.Users.deleteUser({ path: { id } }))
}

export function useUsers() {
  return useQuery({ queryKey: userKeys.list(), queryFn: getUsersFn })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation<
    UserWithoutPassword,
    UpdateUserError,
    { id: string; input: UpdateUserInput }
  >({
    mutationFn: ({ id, input }) => updateUserFn(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
      toast.success(`${data.name} has been updated successfully.`)
    },
    onError: (error) => {
      switch (error._tag) {
        case 'UserAlreadyExists':
          toast.error('A user with this email already exists.')
          break
        default:
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
