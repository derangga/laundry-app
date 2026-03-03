import { useState, useEffect } from 'react'
import type { LaundryServiceResponse } from '@laundry-app/shared'
import { useCreateService, useUpdateService } from '@/api/services'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ServiceFormDialogProps {
  service?: LaundryServiceResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormFields {
  name: string
  price: string
  unit_type: 'kg' | 'set' | ''
}

interface FormErrors {
  name?: string
  price?: string
  unit_type?: string
}

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {}
  if (!fields.name.trim()) errors.name = 'Name is required.'
  if (!fields.price.trim()) {
    errors.price = 'Price is required.'
  } else if (isNaN(Number(fields.price)) || Number(fields.price) <= 0) {
    errors.price = 'Price must be a positive number.'
  }
  if (!fields.unit_type) errors.unit_type = 'Unit type is required.'
  return errors
}

export function ServiceFormDialog({
  service,
  open,
  onOpenChange,
}: ServiceFormDialogProps) {
  const [fields, setFields] = useState<FormFields>({
    name: '',
    price: '',
    unit_type: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const createService = useCreateService()
  const updateService = useUpdateService()

  const isEditing = !!service
  const isPending = createService.isPending || updateService.isPending

  useEffect(() => {
    if (service) {
      setFields({
        name: service.name,
        price: String(service.price),
        unit_type: service.unit_type,
      })
    } else {
      setFields({ name: '', price: '', unit_type: '' })
    }
    setErrors({})
  }, [service, open])

  function handleChange(key: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validation = validate(fields)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const payload = {
      name: fields.name.trim(),
      price: Number(fields.price),
      unit_type: fields.unit_type as 'kg' | 'set',
    }

    if (isEditing && service) {
      updateService.mutate(
        { id: service.id, input: payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createService.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Service' : 'Add Service'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-name">Name</Label>
            <Input
              id="service-name"
              type="text"
              maxLength={50}
              value={fields.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Service name"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-price">Price</Label>
            <Input
              id="service-price"
              type="number"
              maxLength={20}
              value={fields.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="0"
              aria-invalid={!!errors.price}
            />
            {errors.price && (
              <p className="text-destructive text-sm">{errors.price}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-unit-type">Unit Type</Label>
            <Select
              value={fields.unit_type}
              onValueChange={(value) => handleChange('unit_type', value)}
            >
              <SelectTrigger id="service-unit-type">
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="set">set</SelectItem>
              </SelectContent>
            </Select>
            {errors.unit_type && (
              <p className="text-destructive text-sm">{errors.unit_type}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
