import { DateTime } from 'effect'
import type { OrderStatus, PaymentStatus } from '@laundry-app/shared'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
}

export const ORDER_STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatDate(dt: DateTime.Utc): string {
  return DateTime.toDateUtc(dt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
