import { useEffect, useState } from 'react'
import type { OrderWithDetails } from '@laundry-app/shared'

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
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/constants'

interface CancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderWithDetails | null
  onConfirm: (notes: string) => void
  isPending?: boolean
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
  isPending = false,
}: CancelOrderDialogProps) {
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      setNotes('')
    }
  }, [open])

  const isPaid = order?.payment_status === 'paid'
  const confirmDisabled = notes.trim() === '' || isPending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Cancel order #{order?.order_number ?? ''}?
          </AlertDialogTitle>
          {isPaid && order ? (
            <AlertDialogDescription>
              This will refund {formatCurrency(order.total_price)} to the
              customer.
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-order-notes">Reason (required)</Label>
          <Textarea
            id="cancel-order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            disabled={isPending}
            placeholder="Explain why this order is being cancelled..."
          />
          <p className="text-muted-foreground text-xs">{notes.length}/500</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={confirmDisabled}
            onClick={(e) => {
              e.preventDefault()
              if (confirmDisabled) return
              onConfirm(notes)
            }}
          >
            {isPaid ? 'Refund & cancel' : 'Cancel order'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
