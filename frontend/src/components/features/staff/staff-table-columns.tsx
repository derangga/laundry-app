import type { ColumnDef } from '@tanstack/react-table'
import type { UserWithoutPassword } from '@laundry-app/shared'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/constants'

interface StaffColumnCallbacks {
  onEdit: (staff: UserWithoutPassword) => void
  onDelete: (staff: UserWithoutPassword) => void
}

export function getStaffColumns(
  callbacks: StaffColumnCallbacks,
): ColumnDef<UserWithoutPassword>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => callbacks.onEdit(row.original)}
            aria-label="Edit staff"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => callbacks.onDelete(row.original)}
            aria-label="Delete staff"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]
}
