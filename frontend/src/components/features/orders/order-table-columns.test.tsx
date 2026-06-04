import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OrderWithDetails } from '@laundry-app/shared'

import { getOrderColumns } from './order-table-columns'

function makeOrder(
  overrides: Partial<OrderWithDetails> = {},
): OrderWithDetails {
  return {
    id: 'order-1',
    order_number: 'ORD-0001',
    status: 'received',
    payment_status: 'unpaid',
    total_price: '100000',
    customer_name: 'John',
    customer_phone: '081234567890',
    created_at: '2024-01-01T00:00:00Z',
    cancelled_at: null,
    cancelled_by_name: null,
    cancellation_reason: null,
    ...overrides,
  } as unknown as OrderWithDetails
}

function isDisabled(el: HTMLElement): boolean {
  return (
    el.hasAttribute('disabled') ||
    el.getAttribute('data-disabled') === 'true' ||
    el.getAttribute('aria-disabled') === 'true'
  )
}

type Callbacks = Parameters<typeof getOrderColumns>[0]

function ActionsCell({
  order,
  callbacks,
}: {
  order: OrderWithDetails
  callbacks: Callbacks
}) {
  const columns = getOrderColumns(callbacks)
  const actionsCol = columns.find((c) => c.id === 'actions')!
  const cellFn = actionsCol.cell as (ctx: {
    row: { original: OrderWithDetails }
  }) => React.ReactNode
  return <>{cellFn({ row: { original: order } })}</>
}

function setup(order: OrderWithDetails) {
  const callbacks: Callbacks = {
    onAdvanceStatus: vi.fn(),
    onTogglePayment: vi.fn(),
    onCancelOrder: vi.fn(),
  }
  render(<ActionsCell order={order} callbacks={callbacks} />)
  return { callbacks }
}

describe('order-table-columns — Toggle Payment disabled state', () => {
  it('Toggle Payment is enabled for a normal unpaid received order', async () => {
    const user = userEvent.setup()
    setup(makeOrder({ status: 'received', payment_status: 'unpaid' }))

    await user.click(screen.getByRole('button'))
    const item = screen.getByText('Toggle Payment')
    expect(isDisabled(item)).toBe(false)
  })

  it('Toggle Payment is disabled when order status is cancelled', async () => {
    const user = userEvent.setup()
    setup(makeOrder({ status: 'cancelled', payment_status: 'unpaid' }))

    await user.click(screen.getByRole('button'))
    const item = screen.getByText('Toggle Payment')
    expect(isDisabled(item)).toBe(true)
  })

  it('Toggle Payment is disabled when payment_status is refunded', async () => {
    const user = userEvent.setup()
    setup(makeOrder({ status: 'cancelled', payment_status: 'refunded' }))

    await user.click(screen.getByRole('button'))
    const item = screen.getByText('Toggle Payment')
    expect(isDisabled(item)).toBe(true)
  })

  it('Toggle Payment is disabled when order status is delivered', async () => {
    const user = userEvent.setup()
    setup(makeOrder({ status: 'delivered', payment_status: 'paid' }))

    await user.click(screen.getByRole('button'))
    const item = screen.getByText('Toggle Payment')
    expect(isDisabled(item)).toBe(true)
  })
})
