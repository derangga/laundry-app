import { createFileRoute, redirect } from '@tanstack/react-router'

import { authKeys } from '@/api/auth'
import type { AuthenticatedUser } from '@laundry-app/shared'

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
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Analytics charts will appear here
        </p>
      </div>
    </div>
  )
}
