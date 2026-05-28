import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OrderWithDetails } from '@laundry-app/shared'

import { CancelOrderDialog } from './cancel-order-dialog'

function makeOrder(
  overrides: Partial<OrderWithDetails> = {},
): OrderWithDetails {
  const base = {
    id: 'order-123',
    order_number: 'ORD-0001',
    payment_status: 'unpaid',
    total_price: '150000',
    ...overrides,
  }
  return base as unknown as OrderWithDetails
}

function isDisabled(el: HTMLElement): boolean {
  return (
    (el as HTMLButtonElement).disabled === true ||
    el.getAttribute('aria-disabled') === 'true' ||
    el.hasAttribute('disabled')
  )
}

describe('CancelOrderDialog', () => {
  it('disables submit when notes are empty', () => {
    const onConfirm = vi.fn()
    render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder()}
        onConfirm={onConfirm}
      />,
    )

    const submit = screen.getByRole('button', { name: /cancel order/i })
    expect(isDisabled(submit)).toBe(true)
  })

  it('disables submit when notes are whitespace only', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder()}
        onConfirm={onConfirm}
      />,
    )

    const textarea = screen.getByLabelText(/reason/i)
    await user.type(textarea, '   ')

    const submit = screen.getByRole('button', { name: /cancel order/i })
    expect(isDisabled(submit)).toBe(true)
  })

  it('renders the character counter and updates as the user types', async () => {
    const user = userEvent.setup()
    render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText(/0\/500/)).toBeTruthy()

    const textarea = screen.getByLabelText(/reason/i)
    await user.type(textarea, 'hello')

    expect(screen.getByText('5/500')).toBeTruthy()
  })

  it('calls onConfirm with the notes value when submitted', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder()}
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByLabelText(/reason/i), 'Customer requested')
    await user.click(screen.getByRole('button', { name: /cancel order/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('Customer requested')
  })

  it('shows refund copy when paid and plain cancel copy when unpaid', () => {
    const { unmount } = render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder({
          payment_status: 'paid',
          total_price: '150000' as unknown as OrderWithDetails['total_price'],
        })}
        onConfirm={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /refund & cancel/i }),
    ).toBeTruthy()
    // Refund-to-customer line should be present when paid (the description,
    // which is distinct from the button label).
    expect(screen.getByText(/refund .* to the customer/i)).toBeTruthy()

    unmount()

    render(
      <CancelOrderDialog
        open={true}
        onOpenChange={() => {}}
        order={makeOrder({ payment_status: 'unpaid' })}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /cancel order/i })).toBeTruthy()
    expect(screen.queryByText(/refund/i)).toBeNull()
  })
})
