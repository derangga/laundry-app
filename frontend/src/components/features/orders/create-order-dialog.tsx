import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import type { LaundryServiceResponse } from '@laundry-app/shared'

import { useCurrentUser } from '@/api/auth'
import { useSearchCustomer } from '@/api/customers'
import { useCreateOrder } from '@/api/orders'
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
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
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

const INITIAL_ITEMS: OrderItem[] = [{ service_id: '', quantity: 1 }]

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderDialog({
  open,
  onOpenChange,
}: CreateOrderDialogProps) {
  const { data: currentUser } = useCurrentUser()
  const { data: services } = useServices()
  const createOrder = useCreateOrder()

  const [phone, setPhone] = useState('')
  const [debouncedPhone, setDebouncedPhone] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<OrderItem[]>(INITIAL_ITEMS)
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>(
    'unpaid',
  )
  const [popoverOpen, setPopoverOpen] = useState(false)

  const { data: customer, isLoading: isSearching } =
    useSearchCustomer(debouncedPhone)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPhone(phone.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [phone])

  useEffect(() => {
    if (debouncedPhone.length > 0) {
      setPopoverOpen(true)
    } else {
      setPopoverOpen(false)
    }
  }, [debouncedPhone])

  const servicesMap = useMemo(() => {
    if (!services) return new Map<string, LaundryServiceResponse>()
    return new Map(services.map((s) => [s.id as string, s]))
  }, [services])

  function resetForm() {
    setPhone('')
    setDebouncedPhone('')
    setCustomerId('')
    setCustomerName('')
    setItems([{ service_id: '', quantity: 1 }])
    setPaymentStatus('unpaid')
    setPopoverOpen(false)
  }

  function handleClose() {
    onOpenChange(false)
    resetForm()
  }

  function handleSelectCustomer(id: string, name: string) {
    setCustomerId(id)
    setCustomerName(name)
    setPopoverOpen(false)
  }

  function handleSubmit() {
    if (!currentUser) return

    createOrder.mutate(
      {
        customer_id: customerId,
        items,
        created_by: currentUser.id,
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
    !customerId ||
    items.some((i) => !i.service_id || i.quantity < 1) ||
    createOrder.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Phone search */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Phone</label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverAnchor asChild>
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search customer by phone..."
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      setCustomerId('')
                      setCustomerName('')
                    }}
                  />
                </InputGroup>
              </PopoverAnchor>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-1"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {isSearching ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    Searching...
                  </p>
                ) : customer ? (
                  <Item
                    size="sm"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() =>
                      handleSelectCustomer(customer.id, customer.name)
                    }
                  >
                    <ItemContent>
                      <ItemTitle>{customer.name}</ItemTitle>
                      <p className="text-muted-foreground text-sm">
                        {customer.phone}
                      </p>
                    </ItemContent>
                  </Item>
                ) : (
                  <p className="text-muted-foreground p-3 text-sm">
                    Customer not found
                  </p>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Customer name (readonly) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Customer Name</label>
            <Input
              readOnly
              value={customerName}
              placeholder="Select a customer above"
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
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
