# Cancel Order — Product Requirements Document

## Document Information

| Field        | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| Initiative   | Cancel Order (with implicit refund-on-cancel for paid orders) |
| Status       | Draft → Ready for implementation                              |
| Owner        | dimas.armando@sociolla.com                                    |
| Date         | 2026-05-28                                                    |
| Related docs | `docs/PRD.md` (master), `docs/ADR_BACKEND.md` (schema)        |

---

## 1. Executive Summary

The laundry app currently provides no way to cancel an order once it has been received. Operationally, orders are cancelled for real (customer changes their mind, payment is refunded out-of-band) but the system has no record of this — cancelled orders linger in the workflow as if active, the audit trail for _why_ is non-existent, and analytics (revenue, order count, pending payments) silently include voided transactions.

This initiative adds an **admin-only cancel action** with a **required reason note**, **implicit refund** when the order was already paid, **immutable audit fields** (who cancelled, when, why), and **analytics updates** that distinguish fulfilled from cancelled volume so the dashboard tells the truth.

---

## 2. Problem Statement

1. **No cancellation path.** Once an order is created, the only forward motion is `received → in_progress → ready → delivered`. There is no way to terminate an order that should not be fulfilled.
2. **No audit.** When the business does cancel an order (out-of-system), there is no record of the admin, time, or reason — which makes post-hoc reconciliation impossible.
3. **No refund accounting.** When an order was paid up-front and then needs to be voided, the `payment_status='paid'` flag remains, distorting revenue.
4. **Analytics are misleading.** Dashboard revenue and order counts include orders that operationally no longer exist.

---

## 3. Goals & Non-Goals

### Goals

- Allow an admin to cancel a received order in one action, capturing a mandatory reason.
- Atomically refund the payment when a paid order is cancelled (single user action, single DB transaction).
- Preserve a permanent, immutable audit trail (who, when, why).
- Surface cancellation visibly in the order table (badge + hover audit details).
- Adjust analytics so revenue and fulfilled-order counts exclude cancellations; add a dedicated cancellation metric.

### Non-Goals (Out of Scope)

- **Partial refunds.** Refund is all-or-nothing; refund amount equals `total_price`.
- **Un-cancel.** Cancellation is terminal. If wrong, create a new order.
- **Refund without cancel.** Refunding always cancels the order.
- **Customer-initiated cancellation.** Admin only.
- **Cancellation of orders past `received` state.** If staff has started work, cancellation must happen out-of-system. UI hides the action; API rejects it.
- **Notifications** (email/SMS) to the customer on cancellation.

---

## 4. User Personas & Stories

### Persona — Admin (existing, see master PRD §3 Persona 2)

**Story A — Cancel an unstarted, unpaid order.**
_As an admin, when a customer changes their mind before we begin processing, I want to cancel the order with a one-sentence reason so my records reflect reality._

- Given an order with `status='received'` and `payment_status='unpaid'`.
- When the admin selects "Cancel order" from the row's action menu, enters a reason, and confirms.
- Then the order is marked cancelled, the row badge shows "Cancelled" with the reason on hover, and the order no longer counts toward fulfilled-order metrics.

**Story B — Refund + cancel a paid order.**
_As an admin, when a customer who already paid changes their mind, I want one action that both refunds and cancels, so I don't have to track two separate steps._

- Given an order with `status='received'` and `payment_status='paid'`.
- When the admin selects "Cancel order", the dialog reads "This will refund Rp X to the customer" and the destructive button reads "Refund & cancel".
- Then on confirm: `status='cancelled'`, `payment_status='refunded'`, audit fields set — all in one transaction. Revenue no longer includes this order.

**Story C — Audit the cancellation.**
_As an admin reviewing the order list, I want to see at a glance which orders were cancelled and by whom, so I can investigate patterns or specific incidents._

- Cancelled rows display a destructive-styled "Cancelled" badge in the status column.
- Hovering the badge reveals `cancelled_by_name`, `cancelled_at` (formatted), and the `cancellation_reason`.

**Story D — Monitor cancellation volume.**
_As an admin tracking shop health, I want to see how many orders are being cancelled, so I can spot operational issues._

- Dashboard shows a "Cancelled orders (this week)" stat card.
- Weekly chart adds a series for cancellation count alongside orders/revenue.

---

## 5. Functional Requirements

### FR-1: Cancel Order Endpoint

**FR-1.1** A new endpoint `POST /api/orders/:id/cancel` accepts `{ notes: string }` and returns the updated order.

**FR-1.2** Authorization: admin only. Enforced by `AuthAdminMiddleware`. Staff role → `403 Forbidden`.

**FR-1.3** Precondition: `status === 'received'`. Any other status → `409 OrderCannotBeCancelled` (error payload carries the current `status` and `payment_status` so the client can render an accurate message).

**FR-1.4** Behaviour by current payment state, atomic in one SQL `UPDATE`:

| Current `payment_status` | After cancel: `status`                               | After cancel: `payment_status` |
| ------------------------ | ---------------------------------------------------- | ------------------------------ |
| `unpaid`                 | `cancelled`                                          | `unpaid` (unchanged)           |
| `paid`                   | `cancelled`                                          | `refunded`                     |
| `refunded`               | (not reachable — refunded implies already cancelled) | —                              |

**FR-1.5** Notes validation: `nonEmptyString` (after trim) and `maxLength(500)`. Empty/whitespace-only → 422 schema-validation error.

**FR-1.6** Audit fields written on success:

- `cancelled_at = NOW()`
- `cancelled_by = <admin user id from CurrentUser>`
- `cancellation_reason = <trimmed notes>`

### FR-2: Status Model

**FR-2.1** `OrderStatus` enum extended to `received | in_progress | ready | delivered | cancelled`.

**FR-2.2** `cancelled` is a terminal status. `OrderStatusValidator.validTransitions['cancelled'] = []`. No status transition out of `cancelled` is permitted.

**FR-2.3** No status transition _into_ `cancelled` is permitted via `PATCH /orders/:id/status`. The cancel endpoint is the only writer of `status='cancelled'` — this guarantees audit fields are always populated.

**FR-2.4** `PaymentStatus` enum extended to `paid | unpaid | refunded`. `refunded` is set only by the cancel endpoint.

### FR-3: Admin UI — Order Table

**FR-3.1** In the row's action `DropdownMenu`, a "Cancel order" item appears **below** the existing "Toggle payment" item, styled with `text-destructive focus:text-destructive`.

**FR-3.2** The cancel item is rendered only when `order.status === 'received'`. For any other status (including `cancelled`), the item is omitted from the menu.

**FR-3.3** Clicking the item opens an `AlertDialog`:

- Title: `Cancel order #{order_number}?`
- Body:
  - Always: explanation that this cannot be undone.
  - If `payment_status === 'paid'`: "This will refund Rp {total_price} to the customer."
- `Textarea` labelled `Reason (required)`, `maxLength={500}`, live `X / 500` counter beneath.
- Footer buttons: `[Keep order]` (neutral, dismisses) and `[Cancel order]` / `[Refund & cancel]` (destructive variant; copy depends on payment state).
- The destructive button is disabled when the trimmed notes are empty.

**FR-3.4** On confirmation, the frontend calls the cancel endpoint, invalidates the orders + analytics queries on success, closes the dialog, and shows a toast.

### FR-4: Admin UI — Cancellation Visibility

**FR-4.1** Rows with `status='cancelled'` display a destructive-styled "Cancelled" badge in the status column.

**FR-4.2** The badge is wrapped in a shadcn `HoverCard` showing:

- `Cancelled by: {cancelled_by_name}`
- `When: {cancelled_at, formatted}`
- `Reason: {cancellation_reason}`

### FR-5: Analytics

**FR-5.1** `DashboardStatsResponse` gains `cancelled_orders: number` — count of orders cancelled in the current week.

**FR-5.2** `WeeklyDataPoint` gains `cancelled_count: number` — per-week cancellation count for the chart.

**FR-5.3** Existing metrics are redefined to **exclude** cancelled orders:

- `total_revenue`: only orders with `status != 'cancelled' AND payment_status = 'paid'`. Refunded payments do not count.
- `order_count`: only orders with `status != 'cancelled'`.
- `pending_payments`: only orders with `status != 'cancelled' AND payment_status = 'unpaid'`.

**FR-5.4** Dashboard frontend renders the new `cancelled_orders` stat as a card; weekly chart renders the new `cancelled_count` series.

---

## 6. Non-Functional Requirements

- **Authorization** — admin-only enforced server-side via existing middleware; frontend gates are convenience only.
- **Audit immutability** — once written, audit fields are not editable through any application surface. No UPDATE-audit endpoint exists.
- **Atomicity** — cancel + refund happen in a single SQL `UPDATE` so partial states cannot leak.
- **Backwards compatibility** — existing orders pre-migration have NULL audit fields and never display the badge.
- **Typed errors** — `OrderCannotBeCancelled` is a `Schema.TaggedError`, mapped to HTTP 409 by the existing error-handler middleware.

---

## 7. Data Model Changes

### `orders` table

- `status` CHECK constraint: add `'cancelled'`.
- `payment_status` CHECK constraint: add `'refunded'`.
- New columns (all nullable, no backfill):
  - `cancelled_at TIMESTAMPTZ NULL`
  - `cancelled_by UUID NULL REFERENCES users(id)`
  - `cancellation_reason TEXT NULL`
- New index: `idx_orders_cancelled_at ON orders(cancelled_at)` to support analytics filters.

### Shared schemas (`packages/shared/src/`)

- `order.ts`: extend `OrderStatus`, extend `PaymentStatus`, add `CancelOrderInput`, add nullable audit fields to `OrderWithDetails` (including joined `cancelled_by_name`).
- `analytics.ts`: extend `DashboardStatsResponse` and `WeeklyDataPoint` with cancellation counts.

---

## 8. API Surface

| Method | Path                     | Auth  | Body                | Success                | Errors                                                                                                |
| ------ | ------------------------ | ----- | ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/api/orders/:id/cancel` | Admin | `{ notes: string }` | 200 OK + updated order | 401 Unauthorized, 403 Forbidden, 404 OrderNotFound, 409 OrderCannotBeCancelled, 422 schema validation |

---

## 9. Analytics Impact (Behaviour Change)

Pre-existing dashboards will look slightly different after release:

- `weekly_revenue` and `order_count` will decrease as historical cancelled orders are excluded. _(Until this migration ships there are zero cancelled orders, so on day-one the dashboard is unchanged.)_
- `pending_payments` will exclude any unpaid order that has been cancelled.
- A new "Cancelled (this week)" card and a new chart series appear on the dashboard.

This is intentional: the prior numbers were misleading whenever cancellation happened out-of-system. Communicate this in the release note for admins.

---

## 10. Acceptance Criteria

1. Migration applies cleanly; `down` migration also works.
2. Admin can cancel a received+unpaid order; status badge updates; HoverCard shows audit fields.
3. Admin can cancel a received+paid order; dialog copy shows refund amount; `payment_status` becomes `refunded`; both fields update in one transaction.
4. Staff role cannot reach the endpoint (403). Cancel item does not appear in the staff dropdown.
5. Cancelling an `in_progress` / `ready` / `delivered` / already-`cancelled` order is impossible from the UI (item hidden) and returns 409 from the API.
6. Notes are required: empty / whitespace-only submit is blocked client-side and rejected by the schema (422) server-side. >500 chars rejected.
7. Cancelled status is terminal: `PATCH /orders/:id/status` from `cancelled → *` returns the existing `InvalidOrderTransition` error.
8. Dashboard reflects the new cancellation stat card and weekly chart series. Revenue + order count exclude cancelled orders.
9. Tests pass: backend unit (use case 3 paths), backend integration (admin 200 / staff 403 / validation), repository (audit columns + join), frontend dialog interaction.

---

## 11. Rollout

- Single deploy, no feature flag. The migration and code ship together.
- No data backfill required.
- Release note for admins highlights the new action + analytics changes (§9).
