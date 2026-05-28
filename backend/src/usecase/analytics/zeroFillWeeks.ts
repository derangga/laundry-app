import { WeeklyDataPoint, WeeklyRow } from '@domain/Analytics'

/**
 * Zero-fill: ensure every Monday between startDate and endDate has a data point.
 * Weeks with no orders show as { total_revenue: 0, order_count: 0, cancelled_count: 0 }.
 */
export const zeroFillWeeks = (
  rows: readonly WeeklyRow[],
  startDate: Date,
  endDate: Date
): WeeklyDataPoint[] => {
  const dataMap = new Map<
    string,
    { total_revenue: number; order_count: number; cancelled_count: number }
  >()
  for (const row of rows) {
    const key = row.week_start.toISOString().slice(0, 10)
    dataMap.set(key, {
      total_revenue: row.total_revenue,
      order_count: row.order_count,
      cancelled_count: row.cancelled_count,
    })
  }

  const result: WeeklyDataPoint[] = []
  const current = new Date(startDate)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diff)

  while (current < endDate) {
    const key = current.toISOString().slice(0, 10)
    const data = dataMap.get(key)
    result.push(
      WeeklyDataPoint.make({
        week_start: key,
        total_revenue: data?.total_revenue ?? 0,
        order_count: data?.order_count ?? 0,
        cancelled_count: data?.cancelled_count ?? 0,
      })
    )
    current.setDate(current.getDate() + 7)
  }

  return result
}
