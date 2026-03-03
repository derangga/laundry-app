/**
 * Services API functions and TanStack Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Schema } from 'effect'
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
  list: () => ['services', 'list'] as const,
}

export async function fetchServices(): Promise<
  readonly LaundryServiceResponse[]
> {
  return api.get('/api/services', Schema.Array(LaundryServiceResponse))
}

export async function createServiceFn(
  input: CreateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return api.post('/api/services', input, LaundryServiceResponse)
}

export async function updateServiceFn(
  id: ServiceId,
  input: UpdateLaundryServiceInput,
): Promise<LaundryServiceResponse> {
  return api.put(`/api/services/${id}`, input, LaundryServiceResponse)
}

export async function deleteServiceFn(
  id: ServiceId,
): Promise<SuccessDeleteService> {
  return api.del(`/api/services/${id}`, SuccessDeleteService)
}

export function useServices() {
  return useQuery({
    queryKey: serviceKeys.list(),
    queryFn: fetchServices,
    staleTime: 5 * 60_000,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLaundryServiceInput) => createServiceFn(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.list() })
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
      queryClient.invalidateQueries({ queryKey: serviceKeys.list() })
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
      queryClient.invalidateQueries({ queryKey: serviceKeys.list() })
      toast.success('Service has been removed.')
    },
    onError: () => {
      toast.error('Failed to delete service. Please try again.')
    },
  })
}
