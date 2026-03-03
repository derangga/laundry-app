import type { ColumnDef } from '@tanstack/react-table'
import type { LaundryServiceResponse } from '@laundry-app/shared'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/constants'

interface ServiceColumnCallbacks {
  onEdit: (service: LaundryServiceResponse) => void
  onDelete: (service: LaundryServiceResponse) => void
  onToggleStatus: (service: LaundryServiceResponse) => void
}

export function getServiceColumns(
  callbacks: ServiceColumnCallbacks,
): ColumnDef<LaundryServiceResponse>[] {
  return [
    {
      id: 'index',
      header: 'No',
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: 'unit_type',
      header: 'Unit Type',
      cell: ({ row }) => row.original.unit_type,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={row.original.is_active}
          onCheckedChange={() => callbacks.onToggleStatus(row.original)}
          aria-label="Toggle service status"
        />
      ),
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
            aria-label="Edit service"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => callbacks.onDelete(row.original)}
            aria-label="Delete service"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]
}
