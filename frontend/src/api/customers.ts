/**
 * Customers API functions and TanStack Query hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { Effect } from 'effect'
import { toast } from 'sonner'
import type { CreateCustomerInput } from '@laundry-app/shared'
import { CustomerResponse } from '@laundry-app/shared'

import { api, HttpError } from '@/lib/api-client'

export const customerKeys = {
  all: ['customers'] as const,
  search: (phone: string) => ['customers', 'search', phone] as const,
}

export async function searchCustomerByPhone(
  phone: string,
): Promise<CustomerResponse | null> {
  return Effect.runPromise(
    api
      .get(
        `/api/customers/search?phone=${encodeURIComponent(phone)}`,
        CustomerResponse,
      )
      .pipe(
        Effect.catchIf(
          (e): e is HttpError => e._tag === 'HttpError' && e.status === 404,
          () => Effect.succeed(null),
        ),
      ),
  )
}

export async function createCustomerFn(
  input: CreateCustomerInput,
): Promise<CustomerResponse> {
  return Effect.runPromise(api.post('/api/customers', input, CustomerResponse))
}

export function useSearchCustomer(phone: string) {
  return useQuery({
    queryKey: customerKeys.search(phone),
    queryFn: () => searchCustomerByPhone(phone),
    enabled: phone.trim().length > 0,
    staleTime: 30_000,
  })
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: createCustomerFn,
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
