import { useQuery } from '@tanstack/react-query'
import {
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@laundry-app/shared'
import { api } from '@/lib/api-client'

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
  const qs = new URLSearchParams()
  if (params?.payment_status) qs.set('payment_status', params.payment_status)
  if (params?.range) qs.set('range', params.range)
  const path = `/api/analytics/weekly${qs.toString() ? `?${qs}` : ''}`
  return api.get(path, WeeklyAnalyticsResponse)
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  return api.get('/api/analytics/dashboard', DashboardStatsResponse)
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
