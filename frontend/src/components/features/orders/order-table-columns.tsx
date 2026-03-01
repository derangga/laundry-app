import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import type { OrderStatus, PaymentStatus } from '@laundry-app/shared'
import { OrderWithDetails } from '@laundry-app/shared'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  ORDER_STATUS_NEXT,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatCurrency,
  formatDate,
} from '@/lib/constants'

const statusColorMap: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-700 border-transparent',
  in_progress: 'bg-amber-100 text-amber-700 border-transparent',
  ready: 'bg-purple-100 text-purple-700 border-transparent',
  delivered: 'bg-green-100 text-green-700 border-transparent',
}

const paymentColorMap: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700 border-transparent',
  unpaid: 'bg-red-100 text-red-700 border-transparent',
}

interface OrderColumnCallbacks {
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void
  onTogglePayment: (orderId: string, currentPayment: PaymentStatus) => void
}

export function getOrderColumns(
  callbacks: OrderColumnCallbacks,
): ColumnDef<OrderWithDetails>[] {
  return [
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => (
        <span className="font-bold font-mono">{row.original.order_number}</span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p>{row.original.customer_name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.customer_phone}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={statusColorMap[row.original.status]}>
          {ORDER_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => (
        <Badge className={paymentColorMap[row.original.payment_status]}>
          {PAYMENT_STATUS_LABELS[row.original.payment_status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'total_price',
      header: 'Total',
      cell: ({ row }) => formatCurrency(row.original.total_price),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { status, payment_status, id } = row.original
        const nextStatus = ORDER_STATUS_NEXT[status]

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!nextStatus}
                onClick={() => {
                  if (nextStatus) {
                    callbacks.onAdvanceStatus(id, nextStatus)
                  }
                }}
              >
                Advance Status
                {nextStatus && (
                  <span className="ml-1 text-muted-foreground">
                    → {ORDER_STATUS_LABELS[nextStatus]}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  callbacks.onTogglePayment(
                    id,
                    payment_status === 'paid' ? 'unpaid' : 'paid',
                  )
                }
              >
                Toggle Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
