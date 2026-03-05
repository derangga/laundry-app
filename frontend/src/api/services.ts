/**
 * Services API functions and TanStack Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Schema, Effect } from 'effect'
import {
  LaundryServiceResponse,
  SuccessDeleteService,
} from '@laundry-app/shared'
import type {
  ServiceId,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
} from '@laundry-app/shared'

import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export const serviceKeys = {
  all: ['services'] as const,
  list: (params?: { include_inactive?: boolean }) =>
    ['services', 'list', params] as const,
}

export async function fetchServices(params?: {
  include_inactive?: boolean
}): Promise<readonly LaundryServiceResponse[]> {
  const url = params?.include_inactive
    ? '/api/services?include_inactive=true'
    : '/api/services'
  return Effect.runPromise(api.get(url, Schema.Array(LaundryServiceResponse)))
}

export async function createServiceFn(
  input: CreateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return Effect.runPromise(
    api.post('/api/services', input, LaundryServiceResponse),
  )
}

export async function updateServiceFn(
  id: ServiceId,
  input: UpdateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return Effect.runPromise(
    api.put(`/api/services/${id}`, input, LaundryServiceResponse),
  )
}

export async function deleteServiceFn(
  id: ServiceId,
): Promise<SuccessDeleteService> {
  return Effect.runPromise(api.del(`/api/services/${id}`, SuccessDeleteService))
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
