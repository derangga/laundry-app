import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import type {
  AuthenticatedUser,
  UserWithoutPassword,
} from '@laundry-app/shared'

import { authKeys } from '@/api/auth'
import { useUsers, useDeleteUser } from '@/api/users'
import { DataTable } from '@/components/shared/data-table'
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
import { RegisterStaffDialog } from '@/components/features/staff/register-staff-dialog'
import { EditStaffDialog } from '@/components/features/staff/edit-staff-dialog'
import { getStaffColumns } from '@/components/features/staff/staff-table-columns'

export const Route = createFileRoute('/_dashboard/staff')({
  beforeLoad: async ({ context }) => {
    const user = context.queryClient.getQueryData<AuthenticatedUser>(
      authKeys.user,
    )
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: StaffPage,
})

function StaffPage() {
  const { data: staff = [], isLoading } = useUsers()
  const [editingStaff, setEditingStaff] = useState<UserWithoutPassword | null>(
    null,
  )
  const [deletingStaff, setDeletingStaff] =
    useState<UserWithoutPassword | null>(null)
  const deleteUser = useDeleteUser()

  const columns = getStaffColumns({
    onEdit: setEditingStaff,
    onDelete: setDeletingStaff,
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Manage Staff</h2>
          <p className="text-muted-foreground">
            Register and manage staff accounts.
          </p>
        </div>
        <RegisterStaffDialog />
      </div>

      <DataTable
        columns={columns}
        data={staff}
        isLoading={isLoading}
        pagination
      />

      <EditStaffDialog
        staff={editingStaff}
        open={editingStaff !== null}
        onOpenChange={(open) => !open && setEditingStaff(null)}
      />

      <AlertDialog
        open={deletingStaff !== null}
        onOpenChange={(open) => !open && setDeletingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingStaff?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingStaff) {
                  deleteUser.mutate(deletingStaff.id, {
                    onSettled: () => setDeletingStaff(null),
                  })
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
