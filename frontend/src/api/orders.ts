/**
 * Orders API functions and TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  OrderStatus,
  PaymentStatus,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
  OrderWithDetails,
  OrderResponse,
  CreateOrderInput,
  CreateWalkInOrderInput,
  CancelOrderInput,
} from '@laundry-app/shared'

import { runClient } from '@/lib/runtime'
import { analyticsKeys } from './analytics'

/**
 * Query keys factory for order-related queries
 */
export const orderKeys = {
  all: ['orders'] as const,
  list: (filters?: object) => ['orders', 'list', filters] as const,
  active: () => ['orders', 'active'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}

/**
 * Filter types
 */

export type OrderFilters = {
  status?: OrderStatus
  payment_status?: PaymentStatus
  order_number?: string
  start_date?: string
  end_date?: string
}

/**
 * API Functions
 */

export async function fetchOrders(
  filters?: OrderFilters,
): Promise<readonly OrderWithDetails[]> {
  return runClient((client) =>
    client.Orders.list({
      urlParams: {
        status: filters?.status,
        payment_status: filters?.payment_status,
        order_number: filters?.order_number,
        start_date: filters?.start_date,
        end_date: filters?.end_date,
      },
    }),
  )
}

export async function updateOrderStatusFn(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderResponse> {
  return runClient((client) =>
    client.Orders.updateStatus({ path: { id }, payload: input }),
  )
}

export async function updatePaymentStatusFn(
  id: string,
  input: UpdatePaymentStatusInput,
): Promise<OrderResponse> {
  return runClient((client) =>
    client.Orders.updatePayment({ path: { id }, payload: input }),
  )
}

export async function cancelOrderFn(
  id: string,
  input: CancelOrderInput,
): Promise<OrderResponse> {
  return runClient((client) =>
    client.Orders.cancel({ path: { id }, payload: input }),
  )
}

export interface CreateOrderParams {
  customer_id: string
  items: { service_id: string; quantity: number }[]
  created_by: string
  payment_status?: 'paid' | 'unpaid'
}

export async function createOrderFn(
  input: CreateOrderParams,
): Promise<OrderResponse> {
  // Form values arrive as plain strings; the payload schema brands ids/decimals
  // and is validated server-side, so we widen through `unknown` (matching the
  // old client, which accepted an untyped body).
  return runClient((client) =>
    client.Orders.create({ payload: input as unknown as CreateOrderInput }),
  )
}

export interface CreateWalkInOrderParams {
  customer_name: string
  customer_phone: string
  customer_address?: string | null
  items: { service_id: string; quantity: number }[]
  payment_status?: 'paid' | 'unpaid'
}

export async function createWalkInOrderFn(
  input: CreateWalkInOrderParams,
): Promise<OrderResponse> {
  return runClient((client) =>
    client.Orders.createWalkIn({
      payload: {
        ...input,
        customer_address: input.customer_address ?? null,
      } as unknown as CreateWalkInOrderInput,
    }),
  )
}

/**
 * TanStack Query Hooks
 */

/**
 * Fetch orders with server-side filtering
 */
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
  })
}

/**
 * Fetch active orders (received or in_progress), auto-refreshing every 30s
 */
export function useActiveOrders() {
  return useQuery<
    readonly OrderWithDetails[],
    Error,
    readonly OrderWithDetails[]
  >({
    queryKey: orderKeys.active(),
    queryFn: () => fetchOrders(),
    select: (data) =>
      data.filter((o) => o.status === 'received' || o.status === 'in_progress'),
    refetchInterval: 30_000,
  })
}

/**
 * Mutation to advance an order's status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatusFn(id, { status } as UpdateOrderStatusInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Order status updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Mutation to create a new order for an existing customer
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrderFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Order created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Mutation to create a walk-in order (new customer + order)
 */
export function useCreateWalkInOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWalkInOrderFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Customer registered and order created')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Mutation to toggle an order's payment status
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payment_status,
    }: {
      id: string
      payment_status: PaymentStatus
    }) =>
      updatePaymentStatusFn(id, {
        payment_status,
      } as UpdatePaymentStatusInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Payment status updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Mutation to cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      cancelOrderFn(orderId, { notes } as CancelOrderInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all })
      toast.success('Order cancelled')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
