# Phase 6: Manage Staff Page (Admin Only)

**Goal**: Build the admin-only page for registering new staff and admin accounts using the `POST /api/auth/register` endpoint.

**Prerequisites**: Phase 1 complete (API client, auth module), Phase 2 complete (admin route guard, dashboard layout)

---

## Tasks

### 6.1 Extend Auth API Module

**Extend `frontend/src/api/auth.ts`:**
- Add `registerUserFn(input: CreateUserInput): Promise<UserWithoutPassword>` — `POST /api/auth/register` with Bearer token
- Add `useRegisterUser()` mutation hook:
  - On success: toast.success "User {name} created successfully", reset form
  - On error: toast.error with backend message (e.g., "User already exists with email: ...")

### 6.2 Create Register Staff Form Component

**Create `frontend/src/components/features/staff/register-staff-form.tsx`:**
- Form inside a shadcn `Card` with heading "Register New User"
- Fields:
  | Field | Component | Validation |
  |-------|-----------|------------|
  | Name | shadcn `Input` | Required, non-empty |
  | Email | shadcn `Input` (type email) | Required, valid email format |
  | Password | shadcn `Input` (type password) | Required, min 8 characters |
  | Role | shadcn `Select` ("Staff", "Admin") | Required |
- Submit button (shadcn `Button`) with loading state during mutation
- Uses `useRegisterUser()` mutation
- On success: form fields reset to empty
- On validation error (client-side): show inline error text below the field
- On API error: toast.error with backend message

### 6.3 Build Manage Staff Page

**Replace placeholder in `frontend/src/routes/_dashboard/staff.tsx`:**
- `beforeLoad`: admin role check (redirect staff to `/`)
- Page heading: "Manage Staff"
- Renders `<RegisterStaffForm />` centered (max-w-lg)
- Error state: if page-level errors occur, display error state component
- Empty state: not applicable for this page (it's a form)

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/api/auth.ts` (add `registerUserFn`, `useRegisterUser`) |
| Create | `src/components/features/staff/register-staff-form.tsx` |
| Modify | `src/routes/_dashboard/staff.tsx` (replace placeholder) |

## Acceptance Criteria

- [ ] Manage Staff page is only accessible to admin users
- [ ] Staff users redirected to `/` when accessing `/staff`
- [ ] Registration form has fields: name, email, password, role
- [ ] Client-side validation: required fields, email format, password min 8 chars
- [ ] Invalid fields show inline error messages below the field
- [ ] Successful registration shows toast.success and resets the form
- [ ] Duplicate email shows toast.error "User already exists with email: ..."
- [ ] Submit button shows loading spinner during API call
- [ ] Role selector allows choosing between "Staff" and "Admin"
- [ ] API errors are shown via Sonner toast

## Dependencies

- **Phase 1**: API client, auth module, `CreateUserInput` and `UserWithoutPassword` types
- **Phase 2**: Dashboard layout, admin route guard
