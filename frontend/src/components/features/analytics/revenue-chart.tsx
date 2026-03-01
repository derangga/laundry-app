import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import type { WeeklyDataPoint } from '@laundry-app/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/constants'

const chartConfig = {
  total_revenue: {
    label: 'Revenue',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function formatWeekStart(value: string): string {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface RevenueChartProps {
  data: WeeklyDataPoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={data}>
            <XAxis
              dataKey="week_start"
              tickFormatter={formatWeekStart}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
              width={80}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatWeekStart(label as string)}
                  formatter={(value) => [
                    formatCurrency(value as number),
                    'Revenue',
                  ]}
                />
              }
            />
            <Bar
              dataKey="total_revenue"
              fill="var(--color-total_revenue)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
