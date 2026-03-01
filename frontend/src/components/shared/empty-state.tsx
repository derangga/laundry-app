import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm text-center">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
