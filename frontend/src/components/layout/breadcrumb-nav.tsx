import { useRouterState } from '@tanstack/react-router'

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/history': 'History Order',
  '/analytics': 'Analytics',
  '/staff': 'Manage Staff',
}

export function BreadcrumbNav() {
  const router = useRouterState()
  const label = routeLabels[router.location.pathname] || 'Dashboard'

  return (
    <div className="flex items-center gap-2 px-4">
      <h1 className="text-lg font-semibold">{label}</h1>
    </div>
  )
}
