import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import type { OrderStatus, PaymentStatus } from '@laundry-app/shared'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { getOrderColumns } from '@/components/features/orders/order-table-columns'
import { OrderFilters } from '@/components/features/orders/order-filters'
import {
  useOrders,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from '@/api/orders'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

export const Route = createFileRoute('/_dashboard/history')({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || undefined,
    payment_status: (search.payment_status as string) || undefined,
    order_number: (search.order_number as string) || undefined,
    start_date: (search.start_date as string) || undefined,
    end_date: (search.end_date as string) || undefined,
  }),
  component: HistoryPage,
})

interface ConfirmDialog {
  open: boolean
  orderId: string
  nextStatus: OrderStatus
}

function HistoryPage() {
  const { status, payment_status, order_number, start_date, end_date } =
    Route.useSearch()
  const navigate = useNavigate()

  // Local search input state with debounce
  const [searchInput, setSearchInput] = useState(order_number ?? '')

  // Sync searchInput when URL param changes externally (e.g. reset)
  useEffect(() => {
    setSearchInput(order_number ?? '')
  }, [order_number])

  // Debounce search input to URL param
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim() || undefined
      if (trimmed !== order_number) {
        navigate({
          to: '/history',
          search: (prev) => ({
            status: prev.status,
            payment_status: prev.payment_status,
            order_number: trimmed,
            start_date: prev.start_date,
            end_date: prev.end_date,
          }),
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, order_number, navigate])

  // Build date range from URL params
  const dateRange: DateRange | undefined = start_date
    ? {
        from: new Date(start_date),
        to: end_date ? new Date(end_date) : undefined,
      }
    : undefined

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrders({
    status: status as OrderStatus | undefined,
    payment_status: payment_status as PaymentStatus | undefined,
    order_number,
    start_date,
    end_date,
  })

  const updateOrderStatus = useUpdateOrderStatus()
  const updatePaymentStatus = useUpdatePaymentStatus()

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)

  const columns = getOrderColumns({
    onAdvanceStatus: (orderId, nextStatus) => {
      setConfirmDialog({ open: true, orderId, nextStatus })
    },
    onTogglePayment: (orderId, newPaymentStatus) => {
      updatePaymentStatus.mutate({
        id: orderId,
        payment_status: newPaymentStatus,
      })
    },
  })

  function handleStatusChange(value: string) {
    navigate({
      to: '/history',
      search: (prev) => ({
        status: value === 'all' ? undefined : value,
        payment_status: prev.payment_status,
        order_number: prev.order_number,
        start_date: prev.start_date,
        end_date: prev.end_date,
      }),
    })
  }

  function handlePaymentChange(value: string) {
    navigate({
      to: '/history',
      search: (prev) => ({
        status: prev.status,
        payment_status: value === 'all' ? undefined : value,
        order_number: prev.order_number,
        start_date: prev.start_date,
        end_date: prev.end_date,
      }),
    })
  }

  function handleDateRangeChange(range: DateRange | undefined) {
    navigate({
      to: '/history',
      search: (prev) => ({
        status: prev.status,
        payment_status: prev.payment_status,
        order_number: prev.order_number,
        start_date: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
        end_date: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
      }),
    })
  }

  function handleReset() {
    setSearchInput('')
    navigate({
      to: '/history',
      search: {
        status: undefined,
        payment_status: undefined,
        order_number: undefined,
        start_date: undefined,
        end_date: undefined,
      },
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h2 className="text-3xl font-bold tracking-tight">Order History</h2>

      <OrderFilters
        status={status}
        paymentStatus={payment_status}
        search={searchInput}
        dateRange={dateRange}
        onStatusChange={handleStatusChange}
        onPaymentChange={handlePaymentChange}
        onSearchChange={setSearchInput}
        onDateRangeChange={handleDateRangeChange}
        onReset={handleReset}
      />

      {isLoading ? (
        <DataTable columns={columns} data={[]} isLoading />
      ) : isError ? (
        <ErrorState
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : orders && orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting your filters."
        />
      ) : (
        <DataTable columns={columns} data={[...(orders ?? [])]} pagination />
      )}

      <AlertDialog
        open={confirmDialog?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance Order Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to advance this order to{' '}
              <strong>
                {confirmDialog
                  ? ORDER_STATUS_LABELS[confirmDialog.nextStatus]
                  : ''}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog) {
                  updateOrderStatus.mutate({
                    id: confirmDialog.orderId,
                    status: confirmDialog.nextStatus,
                  })
                  setConfirmDialog(null)
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
