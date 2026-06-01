import { ShoppingBag, Clock, DollarSign, Users, Ban } from 'lucide-react'
import type { DashboardStatsResponse } from '@laundry-app/shared'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/constants'

interface StatsCardsProps {
  data: DashboardStatsResponse | undefined
  isLoading: boolean
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: "Today's Orders",
      value: data?.todays_orders ?? 0,
      icon: ShoppingBag,
    },
    {
      label: 'Pending Payments',
      value: data?.pending_payments ?? 0,
      icon: Clock,
    },
    {
      label: 'Weekly Revenue',
      value: formatCurrency(data?.weekly_revenue ?? 0),
      icon: DollarSign,
    },
    {
      label: 'Total Customers',
      value: data?.total_customers ?? 0,
      icon: Users,
    },
    {
      label: 'Cancelled Orders',
      value: data?.cancelled_orders ?? 0,
      icon: Ban,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Icon className="size-4" />
              {label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
