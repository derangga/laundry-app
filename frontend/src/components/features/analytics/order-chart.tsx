import { Line, LineChart, XAxis, YAxis } from 'recharts'
import type { WeeklyDataPoint } from '@laundry-app/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const chartConfig = {
  order_count: {
    label: 'Orders',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

function formatWeekStart(value: string): string {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface OrderChartProps {
  data: WeeklyDataPoint[]
}

export function OrderChart({ data }: OrderChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={data}>
            <XAxis
              dataKey="week_start"
              tickFormatter={formatWeekStart}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatWeekStart(label as string)}
                  formatter={(value) => [value, 'Orders']}
                />
              }
            />
            <Line
              dataKey="order_count"
              stroke="var(--color-order_count)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-order_count)' }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
