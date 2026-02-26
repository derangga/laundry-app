import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

import { authKeys, getMeFn } from '@/api/auth'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
import { Separator } from '@/components/ui/separator'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.fetchQuery({
        queryKey: authKeys.user,
        queryFn: getMeFn,
        staleTime: Infinity,
      })
    } catch (error) {
      // Re-throw redirect exceptions (TanStack Router uses exceptions)
      if (error && typeof error === 'object' && 'isRedirect' in error) {
        throw error
      }
      // Auth failed - redirect to login
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BreadcrumbNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
