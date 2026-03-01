import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants'

interface OrderFiltersProps {
  status?: string
  paymentStatus?: string
  onStatusChange: (value: string) => void
  onPaymentChange: (value: string) => void
  onReset: () => void
}

export function OrderFilters({
  status,
  paymentStatus,
  onStatusChange,
  onPaymentChange,
  onReset,
}: OrderFiltersProps) {
  const hasActiveFilters = Boolean(status || paymentStatus)

  return (
    <div className="flex items-center gap-2">
      <Select value={status ?? 'all'} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={paymentStatus ?? 'all'} onValueChange={onPaymentChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Payments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payments</SelectItem>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={!hasActiveFilters}
      >
        Reset
      </Button>
    </div>
  )
}
