import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Inbox } from 'lucide-react'

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
import {
  useActiveOrders,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from '@/api/orders'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardHome,
})

interface ConfirmDialog {
  open: boolean
  orderId: string
  nextStatus: OrderStatus
}

function DashboardHome() {
  const {
    data: activeOrders,
    isLoading,
    isError,
    error,
    refetch,
  } = useActiveOrders()
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        {activeOrders !== undefined && (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium">
            {activeOrders.length} active
          </span>
        )}
      </div>

      {isLoading ? (
        <DataTable columns={columns} data={[]} isLoading />
      ) : isError ? (
        <ErrorState
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : activeOrders && activeOrders.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-10" />}
          title="No active orders"
          description="Orders with status received or in progress will appear here."
        />
      ) : (
        <DataTable columns={columns} data={activeOrders ?? []} />
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
