# Phase 7: Create New Order Feature

**Goal**: Add a "+ New Order" dropdown button to the dashboard header with two flows: (1) create an order for an existing customer (search by phone), and (2) register a new customer and create an order in one step.

**Prerequisites**: Phase 1 complete (API client, auth module), Phase 3 complete (active orders table on dashboard)

---

## Tasks

### 7.1 Create Customer API Module

**Create `frontend/src/api/customers.ts`:**
- Query keys: `customerKeys = { search: (phone) => ['customers', 'search', phone] }`
- `searchCustomerByPhone(phone: string): Promise<CustomerResponse | null>` — `GET /api/customers/search?phone={phone}`, return `null` on 404 (`ApiError` with status 404)
- `useSearchCustomer(phone: string)` — `useQuery` with `enabled: phone.trim().length > 0`, `staleTime: 30_000`
- `createCustomerFn(input: CreateCustomerInput): Promise<CustomerResponse>` — `POST /api/customers`
- `useCreateCustomer()` — mutation, `onError: toast.error(error.message)`

**Shared imports:** `CustomerResponse`, `CreateCustomerInput` from `@laundry-app/shared`

### 7.2 Create Services API Module

**Create `frontend/src/api/services.ts`:**
- Query keys: `serviceKeys = { all: ['services'], list: () => ['services', 'list'] }`
- `fetchServices(): Promise<readonly LaundryServiceResponse[]>` — `GET /api/services`, decode with `Schema.Array(LaundryServiceResponse)`
- `useServices()` — `useQuery` with `staleTime: 5 * 60_000`

**Shared imports:** `LaundryServiceResponse` from `@laundry-app/shared`

### 7.3 Add Create Order Mutation

**Extend `frontend/src/api/orders.ts`:**
- `createOrderFn(input: CreateOrderInput): Promise<OrderResponse>` — `POST /api/orders`
- `useCreateOrder()` — mutation:
  - `onSuccess`: `toast.success('Order created successfully')`, invalidate `orderKeys.all`
  - `onError`: `toast.error(error.message)`

**Additional shared imports:** `CreateOrderInput` (already imports `OrderResponse`)

### 7.4 Create Order Dialog (Existing Customer Flow)

**Create `frontend/src/components/features/orders/create-order-dialog.tsx`:**

**Props:** `open: boolean`, `onOpenChange: (open: boolean) => void`

**Form state:**
```typescript
interface OrderItem { service_id: string; quantity: number }
// phone, customer_id, customer_name, items: OrderItem[], payment_status: 'paid' | 'unpaid'
```

**Hooks:** `useSearchCustomer(debouncedPhone)`, `useServices()`, `useCreateOrder()`, `useCurrentUser()`

**Debounce:** `useEffect` + `setTimeout(300ms)` on `phone` → `debouncedPhone`

**Layout:**
1. **Phone field** — `InputGroup` + `InputGroupInput` bound to `phone` state. Below the input, show a `Popover` (with `PopoverAnchor`) when `debouncedPhone` is non-empty:
   - **Customer found:** render `Item` (clickable via `onClick`) > `ItemContent` > `ItemTitle` (customer name) + phone as description. Clicking fills `customer_id` + `customer_name` and closes popover
   - **Not found / error:** `<p className="text-muted-foreground text-sm">Customer not found</p>`
2. **Name field** — `Input` with `readOnly`, value = `customer_name`
3. **Order Items section** — map over `items` array, each row:
   - `Select` bound to `service_id` — options from `useServices()` showing `service.name`
   - `InputGroup` with `InputGroupAddon` (align `inline-end`, shows `unit_type` of selected service) + `InputGroupInput` (`type="number"`, `min="1"`, bound to `quantity`)
   - Delete button (`Trash2` icon, `variant="ghost"`, `size="icon"`) — only when `items.length > 1`
   - "Add Service" button: `Button variant="secondary" className="w-full"` with `Plus` icon — appends `{ service_id: '', quantity: 1 }`
4. **Payment Status** — `Select` with options: `paid` → "Paid", `unpaid` → "Unpaid"
5. **DialogFooter:**
   - "Cancel" button (`variant="outline"`) — closes dialog, resets form
   - "Create Order" button — disabled when `!customer_id || items.some(i => !i.service_id || i.quantity < 1) || isPending`

**Submit flow:**
- `createOrder.mutate({ customer_id, items, created_by: currentUser.id, payment_status })`
- `onSuccess`: close dialog, reset form to initial state

**UI components:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`; `Popover`, `PopoverContent`, `PopoverAnchor` from `@/components/ui/popover`; `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` from `@/components/ui/select`; `InputGroup`, `InputGroupAddon`, `InputGroupInput` from `@/components/ui/input-group`; `Input` from `@/components/ui/input`; `Button` from `@/components/ui/button`; `Item`, `ItemContent`, `ItemTitle` from `@/components/ui/item`

### 7.5 Create Order With Customer Dialog (New Customer Flow)

**Create `frontend/src/components/features/orders/create-order-with-customer-dialog.tsx`:**

**Props:** `open: boolean`, `onOpenChange: (open: boolean) => void`

**Form state:**
```typescript
// phone (plain input), name (plain input), items: OrderItem[], payment_status: 'paid' | 'unpaid'
```

**Hooks:** `useServices()`, `useCreateCustomer()`, `useCreateOrder()`, `useCurrentUser()`

**Layout:** Same as 7.4 except:
- **Phone field** — plain `Input`, no search, no popover
- **Name field** — plain `Input`, fully editable
- Order Items section and Payment Status are identical to 7.4
- Submit button label: "Register & Create Order"
- Disabled when `!phone.trim() || !name.trim() || items.some(i => !i.service_id || i.quantity < 1) || isPending`

**Submit flow (sequential):**
1. `createCustomer.mutateAsync({ name, phone })` → get `CustomerResponse`
2. `createOrder.mutateAsync({ customer_id: result.id, items, created_by: currentUser.id, payment_status })`
3. On success: `toast.success('Customer registered and order created')`, close dialog, reset form
4. On error: `toast.error(error.message)` (handles both failures)

### 7.6 Add New Order Button to Dashboard

**Modify `frontend/src/routes/_dashboard/index.tsx`:**

**Header changes:**
- Add `justify-between` to the header `div` (currently `flex items-center gap-3`)
- Add a `DropdownMenu` on the right side with trigger `Button` labeled `+ New Order`
- Dropdown items:
  1. "New Order" — sets `orderDialogOpen: true`
  2. "New Order + Register Customer" — sets `registerDialogOpen: true`

**State additions:**
```typescript
const [orderDialogOpen, setOrderDialogOpen] = useState(false)
const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
```

**Render at bottom of component:**
```tsx
<CreateOrderDialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen} />
<CreateOrderWithCustomerDialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen} />
```

**New imports:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/api/customers.ts` |
| Create | `src/api/services.ts` |
| Modify | `src/api/orders.ts` (add `createOrderFn`, `useCreateOrder`) |
| Create | `src/components/features/orders/create-order-dialog.tsx` |
| Create | `src/components/features/orders/create-order-with-customer-dialog.tsx` |
| Modify | `src/routes/_dashboard/index.tsx` (add dropdown + dialogs) |

## Acceptance Criteria

- [ ] Dashboard header shows a "+ New Order" dropdown button
- [ ] Dropdown shows two options: "New Order" and "New Order + Register Customer"
- [ ] **New Order flow:** typing an existing customer phone shows popover with name + phone
- [ ] Clicking the customer in popover auto-fills name (readonly) and sets customer_id
- [ ] Searching a non-existent phone shows "Customer not found" message
- [ ] At least one service + quantity must be selected before submitting
- [ ] Unit type addon (`kg` / `set`) updates based on selected service
- [ ] Payment status can be set to "Paid" or "Unpaid"
- [ ] Create Order submits successfully and shows toast "Order created successfully"
- [ ] New order appears in the active orders table after creation
- [ ] **Register & Create flow:** phone and name are plain editable inputs (no search)
- [ ] Sequential creation: customer first, then order — both must succeed
- [ ] Success toast: "Customer registered and order created"
- [ ] Submit buttons are disabled when required fields are empty or mutation is pending
- [ ] Cancel button closes dialog and resets form state
- [ ] `bun run typecheck` passes with no errors

## Dependencies

- **Phase 1**: API client (`@/lib/api-client`), auth module (`useCurrentUser`)
- **Phase 3**: Active orders table (dashboard page already renders orders)
- **Shared types**: `CustomerResponse`, `CreateCustomerInput`, `LaundryServiceResponse`, `CreateOrderInput`, `OrderResponse` from `@laundry-app/shared`
- **Backend endpoints**: `GET /api/customers/search?phone=`, `POST /api/customers`, `GET /api/services`, `POST /api/orders`
