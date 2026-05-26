/**
 * Services API functions and TanStack Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ServiceId,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  LaundryServiceResponse,
  SuccessDeleteService,
} from '@laundry-app/shared'

import { runClient } from '@/lib/runtime'

export const serviceKeys = {
  all: ['services'] as const,
  list: (params?: { include_inactive?: boolean }) =>
    ['services', 'list', params] as const,
}

export async function fetchServices(params?: {
  include_inactive?: boolean
}): Promise<readonly LaundryServiceResponse[]> {
  return runClient((client) =>
    client.Services.list({
      urlParams: {
        include_inactive: params?.include_inactive ? 'true' : undefined,
      },
    }),
  )
}

export async function createServiceFn(
  input: CreateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return runClient((client) => client.Services.create({ payload: input }))
}

export async function updateServiceFn(
  id: ServiceId,
  input: UpdateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return runClient((client) =>
    client.Services.update({ path: { id }, payload: input }),
  )
}

export async function deleteServiceFn(
  id: ServiceId,
): Promise<SuccessDeleteService> {
  return runClient((client) => client.Services.delete({ path: { id } }))
}

export function useServices(params?: { include_inactive?: boolean }) {
  return useQuery({
    queryKey: serviceKeys.list(params),
    queryFn: () => fetchServices(params),
    staleTime: 5 * 60_000,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLaundryServiceInput) => createServiceFn(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success(`Service "${data.name}" has been created.`)
    },
    onError: () => {
      toast.error('Failed to create service. Please try again.')
    },
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: ServiceId
      input: UpdateLaundryServiceInput
    }) => updateServiceFn(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success(`Service "${data.name}" has been updated.`)
    },
    onError: () => {
      toast.error('Failed to update service. Please try again.')
    },
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: ServiceId) => deleteServiceFn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all })
      toast.success('Service has been removed.')
    },
    onError: () => {
      toast.error('Failed to delete service. Please try again.')
    },
  })
}
