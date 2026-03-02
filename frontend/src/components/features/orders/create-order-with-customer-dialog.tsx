import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import type { LaundryServiceResponse } from '@laundry-app/shared'

import { useCreateWalkInOrder } from '@/api/orders'
import { useServices } from '@/api/services'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OrderItem {
  service_id: string
  quantity: number
}

interface CreateOrderWithCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderWithCustomerDialog({
  open,
  onOpenChange,
}: CreateOrderWithCustomerDialogProps) {
  const { data: services } = useServices()
  const createWalkInOrder = useCreateWalkInOrder()

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [items, setItems] = useState<OrderItem[]>([
    { service_id: '', quantity: 1 },
  ])
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>(
    'unpaid',
  )

  const servicesMap = useMemo(() => {
    if (!services) return new Map<string, LaundryServiceResponse>()
    return new Map(services.map((s) => [s.id as string, s]))
  }, [services])

  function resetForm() {
    setPhone('')
    setName('')
    setItems([{ service_id: '', quantity: 1 }])
    setPaymentStatus('unpaid')
  }

  function handleClose() {
    onOpenChange(false)
    resetForm()
  }

  function handleSubmit() {
    createWalkInOrder.mutate(
      {
        customer_name: name,
        customer_phone: phone,
        items,
        payment_status: paymentStatus,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      },
    )
  }

  const isSubmitDisabled =
    !phone.trim() ||
    !name.trim() ||
    items.some((i) => !i.service_id || i.quantity < 1) ||
    createWalkInOrder.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Order + Register Customer</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Phone */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              placeholder="Customer phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Customer Name</label>
            <Input
              placeholder="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Order items */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Services</label>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={item.service_id}
                  onValueChange={(value) => {
                    const newItems = [...items]
                    newItems[index] = { ...newItems[index], service_id: value }
                    setItems(newItems)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      ?.filter((s) => s.is_active)
                      .map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <InputGroup className="w-32 shrink-0">
                  <InputGroupInput
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index] = {
                        ...newItems[index],
                        quantity: Number(e.target.value),
                      }
                      setItems(newItems)
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    {servicesMap.get(item.service_id)?.unit_type ?? '—'}
                  </InputGroupAddon>
                </InputGroup>

                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                setItems([...items, { service_id: '', quantity: 1 }])
              }
            >
              <Plus className="size-4" />
              Add Service
            </Button>
          </div>

          {/* Payment status */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Payment Status</label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as 'paid' | 'unpaid')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            Register & Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
