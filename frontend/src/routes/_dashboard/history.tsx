import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/history')({
  component: HistoryPage,
})

function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Order History</h2>
        <p className="text-muted-foreground">Order list will appear here</p>
      </div>
    </div>
  )
}
