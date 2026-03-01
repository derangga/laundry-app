import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <AlertCircle className="size-10 text-destructive" />
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm text-center">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
