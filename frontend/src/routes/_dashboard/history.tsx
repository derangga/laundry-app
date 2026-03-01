import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

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
  }),
  component: HistoryPage,
})

interface ConfirmDialog {
  open: boolean
  orderId: string
  nextStatus: OrderStatus
}

function HistoryPage() {
  const { status, payment_status } = Route.useSearch()
  const navigate = useNavigate()

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrders({
    status: status as OrderStatus | undefined,
    payment_status: payment_status as PaymentStatus | undefined,
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
        payment_status: newPaymentStatus as PaymentStatus,
      })
    },
  })

  function handleStatusChange(value: string) {
    navigate({
      to: '/history',
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : value,
      }),
    })
  }

  function handlePaymentChange(value: string) {
    navigate({
      to: '/history',
      search: (prev) => ({
        ...prev,
        payment_status: value === 'all' ? undefined : value,
      }),
    })
  }

  function handleReset() {
    navigate({ to: '/history', search: {} })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h2 className="text-3xl font-bold tracking-tight">Order History</h2>

      <OrderFilters
        status={status}
        paymentStatus={payment_status}
        onStatusChange={handleStatusChange}
        onPaymentChange={handlePaymentChange}
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
        <DataTable columns={columns} data={orders ?? []} pagination />
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
