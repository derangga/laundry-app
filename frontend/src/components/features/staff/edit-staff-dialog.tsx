import { useState } from 'react'
import type { UserWithoutPassword } from '@laundry-app/shared'
import { useUpdateUser } from '@/api/users'
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

interface EditStaffDialogProps {
  staff: UserWithoutPassword | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormFields {
  name: string
  email: string
}

interface FormErrors {
  name?: string
  email?: string
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {}
  if (!fields.name.trim()) errors.name = 'Name is required.'
  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_REGEX.test(fields.email)) {
    errors.email = 'Enter a valid email address.'
  }
  return errors
}

export function EditStaffDialog({
  staff,
  open,
  onOpenChange,
}: EditStaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff</DialogTitle>
        </DialogHeader>
        {staff && (
          <EditStaffForm
            key={staff.id}
            staff={staff}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditStaffForm({
  staff,
  onOpenChange,
}: {
  staff: UserWithoutPassword
  onOpenChange: (open: boolean) => void
}) {
  const [fields, setFields] = useState<FormFields>(() => ({
    name: staff.name,
    email: staff.email,
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const { mutate, isPending } = useUpdateUser()

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

    mutate(
      {
        id: staff.id,
        input: { name: fields.name.trim(), email: fields.email.trim() },
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          type="text"
          value={fields.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Full name"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={fields.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="email@example.com"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email}</p>
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
  )
}
