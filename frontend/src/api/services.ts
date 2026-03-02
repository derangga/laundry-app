/**
 * Services API functions and TanStack Query hooks
 */

import { useQuery } from '@tanstack/react-query'
import { Schema } from 'effect'
import { LaundryServiceResponse } from '@laundry-app/shared'

import { api } from '@/lib/api-client'

export const serviceKeys = {
  all: ['services'] as const,
  list: () => ['services', 'list'] as const,
}

export async function fetchServices(): Promise<
  readonly LaundryServiceResponse[]
> {
  return api.get('/api/services', Schema.Array(LaundryServiceResponse))
}

export function useServices() {
  return useQuery({
    queryKey: serviceKeys.list(),
    queryFn: fetchServices,
    staleTime: 5 * 60_000,
  })
}
