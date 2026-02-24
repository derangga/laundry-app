# Phase 2: App Shell — Dashboard Layout

**Goal**: Build the authenticated dashboard layout with shadcn sidebar-inset pattern, sidebar navigation with role-based menu items, NavUser footer, and route structure with placeholders.

**Prerequisites**: Phase 1 complete (auth infrastructure, login page, useCurrentUser, useLogout hooks)

---

## Tasks

### 2.1 Create Dashboard Layout Route

**Create `frontend/src/routes/_dashboard.tsx`:**
- Pathless layout route using `createFileRoute('/_dashboard')`
- `beforeLoad` hook:
  1. Check if accessToken exists in memory via `getAccessToken()`
  2. If yes, attempt `context.queryClient.fetchQuery()` with `getMeFn` (calls `GET /api/auth/me` if cache empty)
  3. If `/me` succeeds, proceed to route
  4. If no accessToken or `/me` fails (401), read refreshToken from localStorage
  5. If refreshToken exists, call `refreshFn(refreshToken)` → store new tokens, cache user via `setQueryData`
  6. If refresh fails, `clearTokens()` and `throw redirect({ to: '/login' })`
- Component renders the sidebar-inset layout:
  ```
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header> — SidebarTrigger + Separator + BreadcrumbNav </header>
      <main className="flex-1 p-4 pt-0">
        <Outlet />
      </main>
    </SidebarInset>
  </SidebarProvider>
  ```

### 2.2 Create App Sidebar Component

**Create `frontend/src/components/layout/app-sidebar.tsx`:**
- Uses shadcn `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` from `#/components/ui/sidebar`
- Sidebar header: "Laundry Manager" text or logo
- Menu items with lucide-react icons:
  | Label | Icon | Route | Visibility |
  |-------|------|-------|------------|
  | Home | `Home` | `/` | Always |
  | History Order | `ClipboardList` | `/history` | Always |
  | Analytics | `BarChart3` | `/analytics` | Admin only |
  | Manage Staff | `Users` | `/staff` | Admin only |
- Uses TanStack Router `<Link>` with `activeProps` for active state styling
- Uses `useCurrentUser()` to check role for conditional menu rendering
- Sidebar footer: `<NavUser />` component

### 2.3 Create NavUser Component

**Create `frontend/src/components/layout/nav-user.tsx`:**
- Renders in the sidebar footer via `SidebarFooter`
- Shows user avatar (initials from name), display name, email
- Uses shadcn `Avatar`, `AvatarFallback`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `SidebarMenu`, `SidebarMenuButton`
- Dropdown items:
  - "Account" — placeholder for future use
  - Separator
  - "Log out" — calls `useLogout()` mutation
- Follows the NavUser pattern from the user's prompt (SidebarMenuButton triggering DropdownMenu)

### 2.4 Create Breadcrumb Navigation

**Create `frontend/src/components/layout/breadcrumb-nav.tsx`:**
- Uses TanStack Router's `useMatches()` or `useRouterState()` to determine current route
- Maps route paths to labels:
  - `/` → "Home"
  - `/history` → "History Order"
  - `/analytics` → "Analytics"
  - `/staff` → "Manage Staff"
- Renders simple breadcrumb text in the header bar

### 2.5 Create Placeholder Route Pages

**Create `frontend/src/routes/_dashboard/index.tsx`:**
- Simple heading: "Dashboard" with subtext "Active orders will appear here"

**Create `frontend/src/routes/_dashboard/history.tsx`:**
- Simple heading: "Order History"

**Create `frontend/src/routes/_dashboard/analytics.tsx`:**
- `beforeLoad`: check `user.role !== 'admin'` → redirect to `/`
- Simple heading: "Analytics"

**Create `frontend/src/routes/_dashboard/staff.tsx`:**
- `beforeLoad`: check `user.role !== 'admin'` → redirect to `/`
- Simple heading: "Manage Staff"

### 2.6 Clean Up Starter Content

- **Remove** `frontend/src/components/Header.tsx` — replaced by sidebar
- **Remove** `frontend/src/data/demo-table-data.ts` — starter demo data
- **Remove or redirect** `frontend/src/routes/index.tsx` — the dashboard index is now at `_dashboard/index.tsx`. This old file should either be deleted (if TanStack Router resolves `/` to `_dashboard/index.tsx`) or redirect to the dashboard

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/routes/_dashboard.tsx` |
| Create | `src/routes/_dashboard/index.tsx` |
| Create | `src/routes/_dashboard/history.tsx` |
| Create | `src/routes/_dashboard/analytics.tsx` |
| Create | `src/routes/_dashboard/staff.tsx` |
| Create | `src/components/layout/app-sidebar.tsx` |
| Create | `src/components/layout/nav-user.tsx` |
| Create | `src/components/layout/breadcrumb-nav.tsx` |
| Modify | `src/routes/__root.tsx` (ensure Header is fully removed) |
| Delete | `src/components/Header.tsx` |
| Delete | `src/data/demo-table-data.ts` |
| Delete/Modify | `src/routes/index.tsx` |

## Acceptance Criteria

- [ ] Navigating to `/` when authenticated shows dashboard layout with sidebar
- [ ] Navigating to `/` when NOT authenticated redirects to `/login`
- [ ] Sidebar displays: Home, History Order (always visible), Analytics, Manage Staff (admin only)
- [ ] Active route is visually highlighted in the sidebar
- [ ] NavUser footer shows avatar initials, user name, and email
- [ ] Clicking "Log out" in NavUser dropdown logs out and redirects to `/login`
- [ ] Sidebar is collapsible (shadcn sidebar built-in behavior)
- [ ] Sidebar collapses to sheet on mobile (via `useIsMobile()` hook)
- [ ] Breadcrumb shows current page name in the header
- [ ] Admin-only placeholder routes redirect staff users to `/`
- [ ] All placeholder pages render their heading text
- [ ] Old Header component and demo data are removed

## Dependencies

- **Phase 1**: `useCurrentUser()`, `useLogout()`, `authKeys`, `refreshFn`, token store functions, Toaster in root layout
