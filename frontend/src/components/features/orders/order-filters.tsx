import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface OrderFiltersProps {
  status?: string
  paymentStatus?: string
  search?: string
  dateRange?: DateRange
  onStatusChange: (value: string) => void
  onPaymentChange: (value: string) => void
  onSearchChange: (value: string) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onReset: () => void
}

export function OrderFilters({
  status,
  paymentStatus,
  search,
  dateRange,
  onStatusChange,
  onPaymentChange,
  onSearchChange,
  onDateRangeChange,
  onReset,
}: OrderFiltersProps) {
  const hasActiveFilters = Boolean(
    status || paymentStatus || search || dateRange?.from,
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search order number..."
        value={search ?? ''}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-56"
      />

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

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-60 justify-start text-left font-normal',
              !dateRange?.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM d, yyyy')} –{' '}
                  {format(dateRange.to, 'MMM d, yyyy')}
                </>
              ) : (
                format(dateRange.from, 'MMM d, yyyy')
              )
            ) : (
              'Pick a date range'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

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
