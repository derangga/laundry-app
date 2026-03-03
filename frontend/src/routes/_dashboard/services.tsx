import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import type {
  AuthenticatedUser,
  LaundryServiceResponse,
} from '@laundry-app/shared'

import { authKeys } from '@/api/auth'
import { useServices, useDeleteService, useUpdateService } from '@/api/services'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { WashingMachine } from 'lucide-react'
import { ServiceFormDialog } from '@/components/features/services/service-form-dialog'
import { getServiceColumns } from '@/components/features/services/service-table-columns'

export const Route = createFileRoute('/_dashboard/services')({
  beforeLoad: async ({ context }) => {
    const user = context.queryClient.getQueryData<AuthenticatedUser>(
      authKeys.user,
    )
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: ServicesPage,
})

function ServicesPage() {
  const { data: services = [], isLoading, error, refetch } = useServices()
  const [editingService, setEditingService] =
    useState<LaundryServiceResponse | null>(null)
  const [deletingService, setDeletingService] =
    useState<LaundryServiceResponse | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const deleteService = useDeleteService()
  const updateService = useUpdateService()

  const columns = getServiceColumns({
    onEdit: setEditingService,
    onDelete: setDeletingService,
    onToggleStatus: (service) => {
      updateService.mutate({
        id: service.id,
        input: { is_active: !service.is_active },
      })
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Manage Services</h2>
          <p className="text-muted-foreground">
            Create and manage laundry services.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Service</Button>
      </div>

      {error ? (
        <ErrorState
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : !isLoading && services.length === 0 ? (
        <EmptyState
          icon={<WashingMachine className="size-10" />}
          title="No services yet"
          description="Get started by adding your first laundry service."
        />
      ) : (
        <DataTable
          columns={columns}
          data={services as LaundryServiceResponse[]}
          isLoading={isLoading}
          pagination
        />
      )}

      <ServiceFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <ServiceFormDialog
        service={editingService}
        open={editingService !== null}
        onOpenChange={(open) => !open && setEditingService(null)}
      />

      <AlertDialog
        open={deletingService !== null}
        onOpenChange={(open) => !open && setDeletingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingService?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingService) {
                  deleteService.mutate(deletingService.id, {
                    onSettled: () => setDeletingService(null),
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
