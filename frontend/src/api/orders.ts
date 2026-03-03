/**
 * Orders API functions and TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Schema } from 'effect'
import { toast } from 'sonner'
import type {
  OrderStatus,
  PaymentStatus,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
} from '@laundry-app/shared'
import { OrderWithDetails, OrderResponse } from '@laundry-app/shared'

import { api } from '@/lib/api-client'

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
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.payment_status)
    params.set('payment_status', filters.payment_status)
  if (filters?.order_number) params.set('order_number', filters.order_number)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  const qs = params.toString()
  const path = qs ? `/api/orders?${qs}` : '/api/orders'
  return api.get(path, Schema.Array(OrderWithDetails))
}

export async function updateOrderStatusFn(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderResponse> {
  return api.put(`/api/orders/${id}/status`, input, OrderResponse)
}

export async function updatePaymentStatusFn(
  id: string,
  input: UpdatePaymentStatusInput,
): Promise<OrderResponse> {
  return api.put(`/api/orders/${id}/payment`, input, OrderResponse)
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
  return api.post('/api/orders', input, OrderResponse)
}

export interface CreateWalkInOrderParams {
  customer_name: string
  customer_phone: string
  items: { service_id: string; quantity: number }[]
  payment_status?: 'paid' | 'unpaid'
}

export async function createWalkInOrderFn(
  input: CreateWalkInOrderParams,
): Promise<OrderResponse> {
  return api.post('/api/orders/walk-in', input, OrderResponse)
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
    onError: (error: Error) => {
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
    onError: (error: Error) => {
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
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
