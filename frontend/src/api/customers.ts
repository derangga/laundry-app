/**
 * Customers API functions and TanStack Query hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { Effect } from 'effect'
import { toast } from 'sonner'
import type { CreateCustomerInput, CustomerResponse } from '@laundry-app/shared'

import type { ApiClientType, ClientError } from '@/lib/runtime'
import { runClient } from '@/lib/runtime'

type CreateCustomerError = ClientError<
  ReturnType<ApiClientType['Customers']['create']>
>

export const customerKeys = {
  all: ['customers'] as const,
  search: (phone: string) => ['customers', 'search', phone] as const,
}

export async function searchCustomerByPhone(
  phone: string,
): Promise<CustomerResponse | null> {
  return runClient((client) =>
    client.Customers.searchByPhone({ urlParams: { phone } }).pipe(
      // A missing customer is an expected "not found", not an error.
      Effect.catchTag('CustomerNotFound', () => Effect.succeed(null)),
    ),
  )
}

export async function createCustomerFn(
  input: CreateCustomerInput,
): Promise<CustomerResponse> {
  return runClient((client) =>
    client.Customers.create({
      payload: {
        ...input,
        address: input.address ?? null,
      } as unknown as CreateCustomerInput,
    }),
  )
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
  return useMutation<
    CustomerResponse,
    CreateCustomerError,
    CreateCustomerInput
  >({
    mutationFn: createCustomerFn,
    onError: (error) => {
      switch (error._tag) {
        case 'CustomerAlreadyExists':
          toast.error('A customer with this phone number already exists.')
          break
        case 'ValidationError':
          toast.error(error.message)
          break
        default:
          toast.error('Failed to create customer. Please try again.')
      }
    },
  })
}
