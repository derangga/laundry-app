import { useQuery } from '@tanstack/react-query'
import type {
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@laundry-app/shared'

import { runClient } from '@/lib/runtime'

export interface WeeklyParams {
  payment_status?: 'paid' | 'unpaid' | 'all'
  range?: 'last_4_weeks' | 'last_8_weeks' | 'last_12_weeks'
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  weekly: (params?: WeeklyParams) => ['analytics', 'weekly', params] as const,
  dashboard: () => ['analytics', 'dashboard'] as const,
}

export async function fetchWeeklyAnalytics(
  params?: WeeklyParams,
): Promise<WeeklyAnalyticsResponse> {
  return runClient((client) =>
    client.Analytics.weekly({
      urlParams: {
        payment_status: params?.payment_status,
        range: params?.range,
      },
    }),
  )
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  return runClient((client) => client.Analytics.dashboard())
}

export function useWeeklyAnalytics(params?: WeeklyParams) {
  return useQuery({
    queryKey: analyticsKeys.weekly(params),
    queryFn: () => fetchWeeklyAnalytics(params),
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: fetchDashboardStats,
  })
}
