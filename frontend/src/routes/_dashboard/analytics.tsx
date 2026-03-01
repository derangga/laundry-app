import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { authKeys } from '@/api/auth'
import { useDashboardStats, useWeeklyAnalytics } from '@/api/analytics'
import type { WeeklyParams } from '@/api/analytics'
import type { AuthenticatedUser } from '@laundry-app/shared'
import { StatsCards } from '@/components/features/analytics/stats-cards'
import { RevenueChart } from '@/components/features/analytics/revenue-chart'
import { OrderChart } from '@/components/features/analytics/order-chart'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_dashboard/analytics')({
  beforeLoad: async ({ context }) => {
    const user = context.queryClient.getQueryData<AuthenticatedUser>(
      authKeys.user,
    )
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const [range, setRange] = useState<WeeklyParams['range']>('last_4_weeks')
  const [paymentStatus, setPaymentStatus] =
    useState<WeeklyParams['payment_status']>('all')

  const params: WeeklyParams = { range, payment_status: paymentStatus }

  const stats = useDashboardStats()
  const weekly = useWeeklyAnalytics(params)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={range}
          onValueChange={(v) => setRange(v as WeeklyParams['range'])}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
            <SelectItem value="last_8_weeks">Last 8 Weeks</SelectItem>
            <SelectItem value="last_12_weeks">Last 12 Weeks</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus}
          onValueChange={(v) =>
            setPaymentStatus(v as WeeklyParams['payment_status'])
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      {stats.isError ? (
        <ErrorState onRetry={stats.refetch} />
      ) : (
        <StatsCards data={stats.data} isLoading={stats.isLoading} />
      )}

      {/* Charts */}
      {weekly.isError ? (
        <ErrorState onRetry={weekly.refetch} />
      ) : weekly.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : weekly.data?.weeks.length === 0 ? (
        <EmptyState title="No data for selected period" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <RevenueChart data={weekly.data?.weeks ?? []} />
          <OrderChart data={weekly.data?.weeks ?? []} />
        </div>
      )}
    </div>
  )
}
