# Laundry Management Application - Product Requirements Document

## Document Information

| Field | Value |
|-------|-------|
| **Title** | Laundry Management Application - Product Requirements Document |
| **Version** | 1.0 |
| **Date** | 2026-02-09 |
| **Status** | Draft |
| **Authors** | Development Team |
| **Stakeholders** | Business Owners, Development Team, QA Engineers |
| **Document Purpose** | Define comprehensive product requirements for the laundry management web application |

---

## 1. Executive Summary

### Product Vision
Streamline laundry business operations with a modern, efficient web application that eliminates manual processes, reduces errors, and provides actionable business insights.

### Target Users
- **Primary Users**: Laundry shop staff and administrators
- **Indirect Users**: Customers (managed by staff, no direct system access)

### Key Value Propositions

1. **Simplified Customer Management**: Fast customer lookup and registration using phone numbers as unique identifiers
2. **Real-time Order Tracking**: Complete visibility into order workflow from receipt to delivery
3. **Flexible Payment Processing**: Support for immediate payment or deferred payment when laundry is ready
4. **Business Intelligence**: Weekly analytics dashboard showing revenue trends and order volumes
5. **Professional Operations**: Automated receipt generation and accurate pricing calculations
6. **Role-Based Access**: Secure access control with distinct permissions for staff and administrators

### Business Impact
- Eliminate manual record-keeping and calculation errors
- Improve payment collection with clear tracking of paid/unpaid orders
- Provide revenue visibility for data-driven business decisions
- Reduce administrative time by 30%
- Support business growth with scalable digital infrastructure

---

## 2. Product Overview

### Background
Small to medium-sized laundry businesses currently rely on manual processes including paper logs, manual calculations, and informal customer records. This leads to inefficiencies, errors, and lack of business visibility. As these businesses grow, the need for digital transformation becomes critical to maintain service quality and operational efficiency.

### Problem Statement

**Current Pain Points**:
1. **Manual Order Tracking**: Paper-based systems are error-prone and difficult to search
2. **Payment Confusion**: No clear tracking of which orders are paid vs unpaid
3. **Lost Customer Data**: Phone numbers and addresses recorded informally, easily lost
4. **Calculation Errors**: Manual price calculations lead to revenue loss
5. **No Business Insights**: Owners cannot track weekly revenue, trends, or performance
6. **Time-Consuming Processes**: Staff waste time searching records and recalculating totals
7. **Service Management**: Difficult to update prices consistently across all records

### Solution Overview
A comprehensive web application that digitizes all laundry business operations:

- **Customer Management**: Quick registration and lookup by phone number
- **Service Catalog**: Flexible service packages with price and unit management (kg/set)
- **Order Processing**: Multi-item orders with automatic price calculation and status tracking
- **Payment Flexibility**: Support for immediate or deferred payment
- **Analytics Dashboard**: Visual weekly revenue and order trends (admin-only)
- **Receipt Generation**: Professional, printable receipts for every order
- **Role-Based Security**: Admin and staff roles with appropriate permissions

**Platform**: Web-only application (desktop and tablet optimized)

---

## 3. User Personas & Use Cases

### Persona 1: Laundry Shop Staff (Primary User)

**Profile**:
- **Name**: Siti (Representative)
- **Role**: Front-desk staff member
- **Age**: 22-35
- **Tech Proficiency**: Basic computer skills
- **Work Environment**: Busy shop front, handles 20-30 customers per day

**Goals**:
- Quickly register new customers and find existing ones
- Create orders accurately without calculation errors
- Track order status as items move through washing/drying/folding
- Process payments efficiently
- Print receipts for customers

**Pain Points**:
- Manual record books are messy and hard to search
- Customers forget if they've paid
- Difficulty calculating complex orders with multiple services
- Lost customer phone numbers mean missed notifications
- No way to see pending orders at a glance

**Primary Workflows**:
1. **Customer Check-in**: Search by phone → Register if new → Create order
2. **Order Creation**: Select services → Enter quantities → Calculate total → Choose payment status
3. **Status Updates**: Mark orders as in-progress, ready, or delivered as work completes
4. **Payment Processing**: Accept payment and update order status
5. **Receipt Printing**: Generate and print receipt for customer

**Success Criteria**:
- Can complete customer registration in under 1 minute
- Can create new order in under 2 minutes
- Zero calculation errors
- Can find any customer by phone in under 10 seconds

---

### Persona 2: Laundry Shop Admin/Owner (Secondary User)

**Profile**:
- **Name**: Pak Budi (Representative)
- **Role**: Business owner/manager
- **Age**: 35-50
- **Tech Proficiency**: Moderate computer skills
- **Work Environment**: Office/shop, reviews operations daily

**Goals**:
- Understand weekly revenue and business performance
- Manage service offerings and pricing
- Identify unpaid orders to follow up
- Make data-driven decisions about business growth
- Ensure staff are using the system correctly

**Pain Points**:
- No visibility into weekly or monthly revenue
- Cannot analyze trends (are sales growing or declining?)
- Difficulty adjusting prices consistently
- No way to track which services are most popular
- Manual counting of unpaid orders is time-consuming

**Primary Workflows**:
1. **Business Review**: View analytics dashboard → Filter by date range → Analyze trends
2. **Service Management**: Add new services → Update prices → Deactivate old services
3. **Revenue Analysis**: Compare paid vs unpaid orders → Identify collection needs
4. **Staff Management**: Create staff accounts → Monitor order creation patterns

**Success Criteria**:
- Can view weekly revenue in under 30 seconds
- Can add/edit services without affecting historical orders
- Can identify unpaid orders to follow up
- Understands business trends through visual charts

---

### Persona 3: Customer (Indirect/Offline User)

**Profile**:
- **Role**: Laundry service customer
- **Interaction**: Through staff only (no direct system access)
- **Payment Preference**: Flexible (immediate or deferred)

**Needs**:
- Quick, efficient service at drop-off
- Accurate pricing without calculation errors
- Flexibility to pay now or when picking up
- Receipt for their records
- Assurance that their order is tracked correctly

**Customer Journey**:
1. **Drop-off**: Provide phone → Staff finds/registers → Staff creates order → Choose payment timing
2. **Status Updates**: (Future: receive SMS when order ready)
3. **Pick-up**: Staff marks as delivered → Payment if unpaid → Receive receipt
4. **Record Keeping**: Keep receipt for warranty/tracking

---

## 4. Functional Requirements

### FR-1: Authentication & Authorization

#### FR-1.1: User Login

**Description**: System shall provide secure email/password authentication with session management.

**Requirements**:
- Login form with email and password fields
- Password validation (minimum 8 characters)
- "Remember me" option for extended sessions
- Secure password hashing (bcrypt or argon2)
- Session management using JWT tokens
- Automatic logout after inactivity (configurable timeout)
- Logout functionality that clears session

**User Roles**:
- **Admin**: Full system access including service management and analytics
- **Staff**: Access to customer management, orders, and payments (no service management or analytics)

**Acceptance Criteria**:
- [ ] Valid credentials grant access to appropriate dashboard
- [ ] Invalid credentials show clear error message
- [ ] Passwords are never stored in plaintext
- [ ] Login sessions persist across browser sessions if "remember me" is checked
- [ ] Logout clears session and redirects to login page
- [ ] Cannot access protected routes without authentication

---

#### FR-1.2: Role-Based Access Control (RBAC)

**Description**: System shall enforce role-based permissions at both UI and API levels.

**Admin Permissions** (Full Access):
- ✅ Customer management (view, create, edit)
- ✅ Order management (view, create, edit, update status)
- ✅ Service management (view, create, edit, delete)
- ✅ Analytics dashboard (view revenue and order trends)
- ✅ Receipt generation
- ✅ User management

**Staff Permissions** (Limited Access):
- ✅ Customer management (view, create, edit)
- ✅ Order management (view, create, edit, update status)
- ✅ Service catalog (view only)
- ❌ Service management (cannot create, edit, or delete)
- ❌ Analytics dashboard (no access)
- ✅ Receipt generation
- ❌ User management

**Acceptance Criteria**:
- [ ] Admin can access all features and pages
- [ ] Staff cannot access `/services/manage` (service CRUD)
- [ ] Staff cannot access `/dashboard/analytics`
- [ ] Staff attempting to access admin-only pages receive 403 Forbidden
- [ ] API endpoints enforce permissions server-side
- [ ] UI hides/shows navigation items based on user role
- [ ] Role is verified on every API request (not just client-side)

---

### FR-2: Customer Management

#### FR-2.1: Customer Search by Phone Number

**Description**: System shall allow searching for customers using phone number as the unique identifier.

**Requirements**:
- Search input field accepts various phone formats
- Phone number normalization:
  - `08123456789` → `+628123456789`
  - `8123456789` → `+628123456789`
  - `+62-812-3456-789` → `+628123456789`
- Search is case-insensitive and strips non-numeric characters (except +)
- Display customer profile if found (name, phone, address, order history)
- Display "Customer not found" message if no match
- Provide "Register New Customer" option when not found

**User Flow**:
1. Staff enters phone number in search field
2. System normalizes phone number
3. System queries database
4. If found: Display customer profile
5. If not found: Show registration form

**Acceptance Criteria**:
- [ ] Search finds customers regardless of phone format variation
- [ ] Normalized phone numbers stored as `+628XXXXXXXXX` format
- [ ] Search returns results within 500ms
- [ ] Customer profile shows recent orders (last 10)
- [ ] "Not found" message is clear and actionable
- [ ] Can proceed to order creation from search results

---

#### FR-2.2: Customer Registration

**Description**: System shall allow staff to register new customers with validated information.

**Required Fields**:
- **Name**: Full name (string, 2-100 characters)
- **Phone**: Indonesian phone number (unique, validated)

**Optional Fields**:
- **Address**: Street address (string, up to 500 characters)

**Validation Rules**:
- Phone number must be valid Indonesian format (+62XXXXXXXXX, 10-13 digits after country code)
- Phone number must be unique (no duplicates)
- Name cannot be empty or only whitespace
- Phone number normalized before storage

**User Flow**:
1. Staff searches for phone number (not found)
2. Staff clicks "Register New Customer"
3. Phone number pre-filled from search
4. Staff enters name and optional address
5. System validates input
6. System creates customer record
7. System displays success message and customer profile

**Acceptance Criteria**:
- [ ] Cannot register duplicate phone numbers (show error: "Phone number already registered")
- [ ] Invalid phone formats rejected with helpful message
- [ ] Successful registration shows customer profile immediately
- [ ] Can proceed to create order after registration
- [ ] Registration completes in under 5 seconds
- [ ] Customer record has `created_at` timestamp

---

### FR-3: Service Package Management (Admin Only)

#### FR-3.1: View Services

**Description**: All authenticated users can view the list of active services.

**Requirements**:
- Display all active services (is_active = true)
- Show: Service name, price (IDR), unit type (kg/set)
- Sort by: Name (alphabetically) or Price
- Filter by: Unit type (kg/set/all)
- Hide inactive services by default
- Admin can toggle to view inactive services

**Display Format**:
| Service Name | Price | Unit |
|--------------|-------|------|
| Regular Laundry | Rp 7,000 | per kg |
| Express Laundry | Rp 10,000 | per kg |
| Bed Cover (1 set) | Rp 15,000 | per set |

**Acceptance Criteria**:
- [ ] All users can view service list
- [ ] Prices displayed in Indonesian Rupiah format (Rp X,XXX)
- [ ] Unit type clearly indicates kg or set
- [ ] Inactive services hidden from order creation
- [ ] Admin sees edit/delete buttons, staff does not

---

#### FR-3.2: Add Service (Admin Only)

**Description**: Administrators can add new laundry service packages.

**Required Fields**:
- **Service Name**: Descriptive name (string, 3-100 characters, unique)
- **Price**: Price in IDR (decimal, > 0, max 999,999)
- **Unit Type**: Measurement unit (enum: 'kg' or 'set')

**Default Values**:
- `is_active`: true
- `created_at`: Current timestamp
- `updated_at`: Current timestamp

**Validation Rules**:
- Service name must be unique (case-insensitive)
- Price must be positive number
- Price stored as decimal (2 decimal places)
- Unit type must be exactly 'kg' or 'set'

**User Flow**:
1. Admin clicks "Add Service" button
2. Modal/form opens with input fields
3. Admin enters service details
4. System validates input
5. Admin clicks "Save"
6. System creates service record
7. System displays success message
8. Service appears in service list immediately

**Acceptance Criteria**:
- [ ] Only admin can access "Add Service" functionality
- [ ] Duplicate service names rejected with error
- [ ] Negative or zero prices rejected
- [ ] New service immediately available for order creation
- [ ] Success message confirms service creation
- [ ] Form resets after successful creation

---

#### FR-3.3: Edit Service (Admin Only)

**Description**: Administrators can update service details including prices.

**Editable Fields**:
- Service name
- Price
- Unit type
- Active status (is_active)

**Critical Rule**: Price changes do NOT affect existing orders
- Order items store `price_at_order` (price snapshot)
- Historical orders preserve original pricing
- Only new orders use updated prices

**User Flow**:
1. Admin clicks "Edit" button on service
2. Modal/form opens with pre-filled values
3. Admin modifies fields
4. System validates input
5. Admin clicks "Save"
6. System updates service record (updated_at timestamp)
7. System displays success message
8. Changes visible immediately

**Acceptance Criteria**:
- [ ] Only admin can edit services
- [ ] Price changes don't affect past orders (verify in order details)
- [ ] Updated prices apply to new orders immediately
- [ ] Validation same as "Add Service"
- [ ] Can change active status to deactivate service
- [ ] Updated timestamp reflects last modification

---

#### FR-3.4: Delete Service (Admin Only)

**Description**: Administrators can soft-delete services to preserve order history.

**Soft Delete Approach**:
- Set `is_active = false` instead of deleting record
- Inactive services:
  - Hidden from service list (default view)
  - Not available for new orders
  - Still visible in historical order details
  - Can be reactivated by admin

**User Flow**:
1. Admin clicks "Delete" button on service
2. System shows confirmation dialog: "Are you sure? This service will be hidden but existing orders will be preserved."
3. Admin confirms
4. System sets is_active = false
5. System displays success message
6. Service disappears from active service list

**Acceptance Criteria**:
- [ ] Only admin can delete services
- [ ] Confirmation dialog prevents accidental deletion
- [ ] Deleted service marked as inactive (not removed from database)
- [ ] Historical orders still show deleted service details
- [ ] Deleted service not available in order creation
- [ ] Admin can view inactive services in settings/archive
- [ ] Admin can reactivate deleted services if needed

---

#### Initial Services (Pre-populated)

The system shall include these default services:

1. **Regular Laundry**
   - Price: Rp 7,000
   - Unit: kg
   - Description: Standard wash, dry, and fold service

2. **Express Laundry**
   - Price: Rp 10,000
   - Unit: kg
   - Description: Same-day or 24-hour service

3. **Bed Cover (1 set)**
   - Price: Rp 15,000
   - Unit: set
   - Description: Single bed cover cleaning

---

### FR-4: Order Management

#### FR-4.1: Create Order

**Description**: System shall allow staff to create orders with multiple service items and automatic pricing.

**Order Creation Steps**:

1. **Customer Selection**
   - Search and select existing customer, OR
   - Register new customer inline

2. **Service Selection**
   - Add one or more service items
   - For each item:
     - Select service from dropdown (active services only)
     - Enter quantity (decimal for kg, integer for sets)
     - Price auto-filled from service catalog
     - Subtotal calculated automatically (quantity × price)
   - "Add Service Item" button to add more rows
   - "Remove" button to delete service items
   - Must have at least one service item

3. **Price Calculation**
   - Total = SUM(subtotal for all items)
   - Display total prominently
   - Calculation updates in real-time as quantities change

4. **Payment Status**
   - Radio buttons: "Paid" or "Unpaid"
   - Default: "Unpaid" (staff selects "Paid" if customer pays immediately)

5. **Order Number Generation**
   - Format: `ORD-YYYYMMDD-XXX`
   - Example: `ORD-20260209-001`
   - XXX = sequential number for the day (001, 002, etc.)
   - Automatically generated on order creation

6. **Price Snapshot**
   - Each order_item stores `price_at_order` from current service price
   - Future service price changes don't affect this order
   - Subtotal also stored for quick retrieval

7. **Initial Status**
   - New orders start with status: "Received"
   - Status progresses through workflow: Received → In Progress → Ready → Delivered

8. **Order Metadata**
   - `created_by`: User ID of staff who created the order
   - `created_at`: Timestamp of order creation
   - `customer_id`: Reference to customer record

**User Flow**:
1. Staff navigates to "New Order"
2. Staff searches/selects customer
3. Staff adds service items (service + quantity)
4. System calculates total automatically
5. Staff selects payment status (paid/unpaid)
6. Staff clicks "Create Order"
7. System validates (at least 1 item, valid quantities)
8. System generates order number
9. System saves order with all items
10. System displays success message with order number
11. System redirects to order details page

**Validation Rules**:
- Customer must be selected
- At least one service item required
- Quantities must be positive numbers
- Quantities > 0 (cannot be zero)
- For 'set' unit type, quantity should be whole number (or allow decimals?)
- Total price must be > 0

**Acceptance Criteria**:
- [ ] Cannot create order without customer
- [ ] Cannot create order without at least one service item
- [ ] Total price calculated correctly for multiple items
- [ ] Order number is unique and follows format ORD-YYYYMMDD-XXX
- [ ] Price snapshot preserved in order_items.price_at_order
- [ ] Order appears in order list immediately
- [ ] Can add up to 10 service items per order
- [ ] Real-time calculation updates as quantities change
- [ ] Success message shows order number
- [ ] Can navigate to order details after creation

---

#### FR-4.2: View Orders (Order List)

**Description**: System shall display a searchable, filterable list of all orders.

**Display Information** (per order):
- Order number
- Customer name and phone
- Order status (badge with color coding)
- Payment status (badge: Paid = green, Unpaid = red)
- Total price (IDR)
- Order date (YYYY-MM-DD HH:MM)
- Actions: View Details, Update Status

**Filtering Options**:
- **Order Status**: All, Received, In Progress, Ready, Delivered
- **Payment Status**: All, Paid, Unpaid
- **Date Range**: Start date - End date
- **Customer Search**: Search by name or phone number

**Sorting Options**:
- Order date (newest first / oldest first)
- Total price (highest / lowest)
- Order number (A-Z / Z-A)

**Pagination**:
- Default: 20 orders per page
- Options: 10, 20, 50, 100 per page
- Page navigation: Previous, Next, page numbers

**Default View**:
- Sort: Newest first
- Filter: All statuses, All payment statuses
- Date range: Last 30 days

**Color Coding**:
- **Status Badges**:
  - Received: Blue
  - In Progress: Yellow/Orange
  - Ready: Purple
  - Delivered: Green
- **Payment Badges**:
  - Paid: Green
  - Unpaid: Red

**User Flow**:
1. Staff navigates to "Orders"
2. System displays order list (default: last 30 days, newest first)
3. Staff applies filters if needed
4. Staff clicks on order to view details
5. Staff can update status or payment from list view

**Acceptance Criteria**:
- [ ] All orders visible to all authenticated users
- [ ] Filters update list in real-time (no page reload)
- [ ] Date range filter shows orders within selected dates
- [ ] Payment status filter shows only matching orders
- [ ] Customer search matches name or phone (partial match)
- [ ] Click on order row navigates to order details
- [ ] List loads within 1 second for up to 1000 orders
- [ ] Pagination works correctly
- [ ] Export to CSV option available (future enhancement)

---

#### FR-4.3: View Order Details

**Description**: System shall display complete order information with update capabilities.

**Order Details Sections**:

1. **Order Information Card**
   - Order number (large, prominent)
   - Order date and time
   - Current status (badge)
   - Payment status (badge)
   - Created by (staff name)

2. **Customer Information Card**
   - Customer name
   - Phone number (clickable to call, if supported)
   - Address (if available)
   - Link to customer profile

3. **Service Items Table**
   - Columns: Service Name, Quantity, Unit, Price, Subtotal
   - Rows: Each service item
   - Footer: Total Price (bold)
   - Note: Prices are from `price_at_order` (historical snapshot)

4. **Status Management**
   - Current status displayed prominently
   - "Update Status" button showing next valid status
   - Status history timeline (optional, future enhancement)

5. **Payment Management**
   - Current payment status
   - "Mark as Paid" button (if unpaid)
   - "Mark as Unpaid" button (if paid)
   - Payment timestamp (when marked paid)

6. **Actions**
   - "Print Receipt" button
   - "Edit Order" button (future enhancement)
   - "Back to Orders" link

**Example Display**:

```
Order #ORD-20260209-001
Status: [In Progress]  Payment: [Unpaid]
Created: 2026-02-09 10:30 by Siti

Customer Details:
Name: Budi Santoso
Phone: +6281234567890
Address: Jl. Merdeka No. 123, Jakarta

Service Items:
| Service          | Quantity | Unit   | Price      | Subtotal    |
|-----------------|----------|--------|------------|-------------|
| Regular Laundry | 5        | kg     | Rp 7,000   | Rp 35,000   |
| Bed Cover       | 2        | set    | Rp 15,000  | Rp 30,000   |
|                 |          |        | **Total:** | **Rp 65,000** |

[Update Status: Mark as Ready]  [Mark as Paid]  [Print Receipt]
```

**User Flow**:
1. Staff clicks on order from list
2. System displays order details page
3. Staff reviews order information
4. Staff can update status or payment
5. Staff can print receipt
6. Staff returns to order list

**Acceptance Criteria**:
- [ ] All order information displayed accurately
- [ ] Service prices match price_at_order (not current service prices)
- [ ] Total calculation is correct
- [ ] Customer information is complete
- [ ] Can update status from this page
- [ ] Can update payment from this page
- [ ] Print receipt opens printable view
- [ ] Page loads within 1 second
- [ ] Responsive design for tablet and desktop

---

#### FR-4.4: Update Order Status

**Description**: System shall allow updating order status through a defined workflow.

**Status Workflow** (Sequential):
```
Received → In Progress → Ready → Delivered
```

**Valid Transitions**:
- Received → In Progress ✅
- In Progress → Ready ✅
- Ready → Delivered ✅
- Cannot skip stages (e.g., Received → Ready directly ❌)
- Can move backward if needed (e.g., Ready → In Progress) ✅

**Status Definitions**:
- **Received**: Order created, laundry received from customer
- **In Progress**: Currently being washed/dried/processed
- **Ready**: Laundry is clean, folded, ready for pickup
- **Delivered**: Customer has picked up the laundry

**User Interface**:
- From order details page or order list
- "Update Status" button shows next logical status
- Dropdown to select any status (with confirmation for backward movement)
- Confirmation dialog for status changes
- Status change reflects immediately in UI

**Business Rules**:
- Any authenticated user can update status
- No role restriction (staff and admin can both update)
- Status change timestamp recorded (future enhancement)
- Cannot mark as "Delivered" if payment is unpaid (optional warning)

**User Flow**:
1. Staff views order details or order list
2. Staff clicks "Update Status" button
3. System shows next status (e.g., "Mark as Ready")
4. Staff confirms
5. System updates order status
6. System displays success message
7. UI updates to show new status

**Acceptance Criteria**:
- [ ] Status progresses through workflow correctly
- [ ] Cannot skip status stages without confirmation
- [ ] Status updates reflect immediately
- [ ] Order list shows updated status badge
- [ ] Order details page shows updated status
- [ ] Timestamp of status change recorded (updated_at)
- [ ] Optional: Warning if marking as Delivered while unpaid

---

#### FR-4.5: Update Payment Status

**Description**: System shall allow toggling payment status at any time during the order lifecycle.

**Payment Workflow**:
- **Initial State**: Set during order creation (Paid or Unpaid)
- **Update Anytime**: Can change from Unpaid → Paid or Paid → Unpaid at any stage

**Payment Scenarios**:
1. **Immediate Payment**: Customer pays when dropping off laundry (order created as "Paid")
2. **Deferred Payment**: Customer pays when picking up (order created as "Unpaid", later marked "Paid")
3. **Payment Reversal**: Accidentally marked paid, needs correction (Paid → Unpaid)

**User Interface**:
- From order details page or order list
- "Mark as Paid" button (if currently unpaid)
- "Mark as Unpaid" button (if currently paid)
- Payment status badge color-coded (Green = Paid, Red = Unpaid)
- Confirmation dialog before changing payment status

**Business Rules**:
- Payment status independent of order status (can be paid at any stage)
- No payment method tracking in MVP (cash, transfer, etc.)
- No payment amount validation (assumes payment = total_price)
- Payment timestamp recorded when marked as paid

**User Flow**:
1. Staff views order details
2. Staff clicks "Mark as Paid" button
3. System shows confirmation: "Confirm payment of Rp 65,000?"
4. Staff confirms
5. System updates payment_status to 'paid'
6. System records payment timestamp
7. System displays success message
8. UI updates to show green "Paid" badge

**Acceptance Criteria**:
- [ ] Can mark order as paid from any status (Received, In Progress, etc.)
- [ ] Can mark order as unpaid if accidentally marked paid
- [ ] Payment status updates reflect immediately
- [ ] Order list shows updated payment badge
- [ ] Analytics dashboard reflects payment changes (paid orders count)
- [ ] Payment timestamp recorded (updated_at)
- [ ] Confirmation dialog prevents accidental changes

---

### FR-5: Payment Processing

#### FR-5.1: Payment at Order Creation

**Description**: System shall support immediate payment during order creation.

**Requirements**:
- "Payment Status" field in order creation form
- Radio buttons: "Paid" or "Unpaid"
- Default selection: "Unpaid"
- If "Paid" selected, order created with payment_status = 'paid'

**User Flow**:
1. Staff creates order with service items
2. Customer chooses to pay immediately
3. Staff selects "Paid" radio button
4. Staff clicks "Create Order"
5. System creates order with payment_status = 'paid'
6. Receipt can be printed immediately

**Acceptance Criteria**:
- [ ] "Paid" option available during order creation
- [ ] Order saved with correct payment status
- [ ] Paid orders appear in analytics immediately
- [ ] No additional payment step needed

---

#### FR-5.2: Deferred Payment

**Description**: System shall support payment after order creation.

**Requirements**:
- Orders created as "Unpaid" can be paid later
- Payment update available from order details page
- Payment update available from order list (quick action)
- No time limit on when payment can be made

**User Flow**:
1. Staff creates order with payment_status = 'unpaid'
2. Days later, customer returns to pick up laundry
3. Staff opens order details
4. Customer pays
5. Staff clicks "Mark as Paid"
6. System updates payment status
7. Receipt can be printed

**Acceptance Criteria**:
- [ ] Unpaid orders clearly marked in order list (red badge)
- [ ] Can update payment status at any time
- [ ] Payment update is quick and easy (one click + confirm)
- [ ] Unpaid orders can be filtered for follow-up

---

#### FR-5.3: Payment Status Tracking

**Description**: System shall provide clear visibility into payment status across the application.

**Requirements**:
- Payment status visible in:
  - Order list (badge)
  - Order details (prominent badge)
  - Analytics dashboard (filter option)
  - Receipts (Paid/Unpaid label)
- Filter orders by payment status
- Highlight unpaid orders for follow-up

**Visual Indicators**:
- **Paid**: Green badge with checkmark icon
- **Unpaid**: Red badge with warning icon

**Analytics Integration**:
- Paid orders included in "Successful Transactions" metric
- Unpaid orders included in "Pending Transactions" metric
- Can filter weekly analytics by Paid/Unpaid/All

**Out of Scope for MVP**:
- Payment method tracking (cash, transfer, e-wallet)
- Payment transaction history or audit log
- Partial payments
- Payment receipts (separate from order receipts)
- Integration with payment gateways

**Acceptance Criteria**:
- [ ] Payment status visible in all order views
- [ ] Can filter orders by payment status
- [ ] Color coding is consistent throughout app
- [ ] Analytics correctly count paid vs unpaid orders
- [ ] Unpaid orders easy to identify for follow-up

---

### FR-6: Analytics Dashboard (Admin Only)

#### FR-6.1: Weekly Revenue Chart

**Description**: System shall display weekly revenue trends as a visual chart (admin only).

**Chart Specifications**:
- **Chart Type**: Line chart or bar chart
- **X-Axis**: Week start dates (e.g., "Jan 1", "Jan 8", "Jan 15")
- **Y-Axis**: Total revenue in Indonesian Rupiah (Rp)
- **Data Points**: Sum of total_price for orders in each week
- **Default Range**: Last 12 weeks
- **Currency Format**: Rp 1,000,000 (with thousand separators)

**Filter Options**:
1. **Paid Orders Only** (Successful Transactions)
   - Only orders with payment_status = 'paid'
   - Shows actual revenue collected

2. **Unpaid Orders Only** (Pending Transactions)
   - Only orders with payment_status = 'unpaid'
   - Shows pending revenue

3. **All Orders** (Combined View)
   - Both paid and unpaid orders
   - Shows total revenue potential

**Date Range Selection**:
- Predefined ranges: Last 4 weeks, Last 12 weeks, Last 6 months, This year
- Custom range: Start date - End date picker
- Chart updates when date range changes

**User Flow**:
1. Admin navigates to "Analytics" or "Dashboard"
2. System displays default view (last 12 weeks, paid orders only)
3. Admin selects filter (Paid/Unpaid/All)
4. Chart updates to show filtered data
5. Admin selects custom date range
6. Chart updates to show selected period

**Acceptance Criteria**:
- [ ] Only admin can access analytics dashboard
- [ ] Staff attempting access receive 403 Forbidden error
- [ ] Chart displays accurate weekly revenue
- [ ] Filters update chart in real-time
- [ ] Currency formatted correctly (Rp X,XXX,XXX)
- [ ] Weeks with zero revenue show as Rp 0 (not empty)
- [ ] Chart responsive on desktop and tablet
- [ ] Loads within 2 seconds for up to 1 year of data

---

#### FR-6.2: Weekly Order Count Chart

**Description**: System shall display weekly order volume trends as a visual chart (admin only).

**Chart Specifications**:
- **Chart Type**: Line chart or bar chart
- **X-Axis**: Week start dates
- **Y-Axis**: Number of orders (integer)
- **Data Points**: COUNT of orders created in each week
- **Default Range**: Last 12 weeks
- **Number Format**: Whole numbers (e.g., 25 orders)

**Filter Options**:
- Same as revenue chart: Paid Only, Unpaid Only, All Orders
- Date range selection (same as revenue chart)

**Display**:
- Can be shown as separate chart below revenue chart
- OR combined in a dual-axis chart (revenue + count)
- Should be visually distinct from revenue chart

**User Flow**:
- Same as FR-6.1, but showing order count instead of revenue

**Business Value**:
- Understand order volume trends (growing or declining)
- Compare order count vs revenue (average order value)
- Identify busy and slow weeks

**Acceptance Criteria**:
- [ ] Chart displays accurate order counts per week
- [ ] Filters match revenue chart (consistent experience)
- [ ] Order count is whole number (not decimal)
- [ ] Weeks with zero orders show as 0 (not empty)
- [ ] Can compare order trends with revenue trends

---

#### FR-6.3: Date Range Selection

**Description**: System shall allow admins to select custom date ranges for analytics.

**Predefined Ranges**:
- Last 4 weeks
- Last 12 weeks (default)
- Last 6 months
- This year (January 1 - Today)
- Last year (full calendar year)

**Custom Range**:
- Start date picker
- End date picker
- Validation: End date must be after start date
- Validation: Date range cannot exceed 2 years

**Behavior**:
- Selecting predefined range updates both charts
- Selecting custom range updates both charts
- Chart data recalculated for selected range
- Loading indicator shown while fetching data
- Date range selection persists in session (not across logins)

**Acceptance Criteria**:
- [ ] Predefined ranges work correctly
- [ ] Custom range validation prevents invalid selections
- [ ] Charts update when date range changes
- [ ] Loading state shown during data fetch
- [ ] No errors for date ranges with no orders

---

### FR-7: Receipt Generation

#### FR-7.1: Generate Receipt

**Description**: System shall generate professional, printable receipts for orders.

**Receipt Content** (Required):
- **Header**:
  - Business name: "Laundry Service" (configurable in future)
  - Business address (optional, configurable)
  - Phone number (optional, configurable)

- **Order Information**:
  - Receipt number (same as order number)
  - Order date and time
  - Order status

- **Customer Information**:
  - Customer name
  - Phone number

- **Service Items Table**:
  - Columns: Service Name, Quantity, Unit, Price, Subtotal
  - Rows: Each order item
  - Uses price_at_order for pricing

- **Pricing Summary**:
  - Subtotal (sum of all items)
  - Total Price (bold, large)

- **Payment Information**:
  - Payment Status: PAID or UNPAID (prominent)
  - If unpaid: "Payment Due" notice

- **Footer**:
  - "Thank you for your business!"
  - Staff name (who created the order)

**Example Receipt**:

```
=========================================
         LAUNDRY SERVICE
   Jl. Sudirman No. 123, Jakarta
         Tel: 021-12345678
=========================================

RECEIPT #ORD-20260209-001
Date: February 9, 2026 - 10:30 AM
Status: Ready for Pickup

-----------------------------------------
Customer: Budi Santoso
Phone: +6281234567890
-----------------------------------------

Service Details:
-----------------------------------------
Regular Laundry
  5 kg × Rp 7,000          Rp 35,000

Bed Cover (1 set)
  2 set × Rp 15,000        Rp 30,000
-----------------------------------------

TOTAL:                     Rp 65,000

PAYMENT STATUS: UNPAID
** Payment due upon pickup **

-----------------------------------------
Served by: Siti
Thank you for your business!
=========================================
```

**Acceptance Criteria**:
- [ ] Receipt contains all required information
- [ ] Pricing calculations are accurate
- [ ] Receipt uses historical prices (price_at_order), not current prices
- [ ] Payment status clearly indicated
- [ ] Receipt formatted for thermal receipt printers (optional)
- [ ] Receipt formatted for A4 paper printing (optional)

---

#### FR-7.2: Print Receipt

**Description**: System shall provide print functionality for receipts.

**Requirements**:
- "Print Receipt" button on order details page
- Clicking button opens print preview
- Print-optimized CSS (hides navigation, buttons, etc.)
- Works with browser print dialog
- Can reprint past receipts at any time

**Print Options**:
- Print immediately after order creation (optional)
- Print from order details page at any time
- Print preview shows receipt before printing

**User Flow**:
1. Staff views order details
2. Staff clicks "Print Receipt" button
3. System generates receipt in new window/tab
4. System applies print stylesheet
5. Browser print dialog opens
6. Staff prints receipt
7. Receipt window can be closed

**Acceptance Criteria**:
- [ ] Print button opens print dialog
- [ ] Receipt formatted correctly for printing
- [ ] Navigation and UI elements hidden in print view
- [ ] Can print receipt multiple times
- [ ] Print preview matches actual print output
- [ ] Works on Chrome, Firefox, Safari, Edge

---

## 5. Non-Functional Requirements

### NFR-1: Performance

**Response Time**:
- **Page Loads**: Complete page render within 2 seconds on standard broadband (10 Mbps+)
- **API Calls**: Return within 500ms at 95th percentile
- **Search Operations**: Customer search returns within 300ms
- **Real-time Calculations**: Order total updates within 100ms of quantity change

**Throughput**:
- **Concurrent Users**: Support minimum 10 concurrent users without degradation
- **Orders per Day**: Handle up to 100 orders per day
- **Database Queries**: Optimized with appropriate indexes (customer.phone, orders.order_number, etc.)

**Scalability Targets**:
- **Monthly Orders**: Support up to 1,000 orders per month initially
- **Customer Database**: Support up to 500 customers initially
- **Historical Data**: Maintain 2+ years of order history without performance loss

**Optimization Requirements**:
- Database connection pooling enabled
- Static assets cached with appropriate headers
- Lazy loading for large datasets (pagination)
- Debounced search inputs to reduce API calls

**Acceptance Criteria**:
- [ ] Page load time < 2 seconds on 10 Mbps connection
- [ ] API response time < 500ms (95th percentile)
- [ ] No UI freezing during data entry
- [ ] Order list loads within 1 second for 1000+ orders

---

### NFR-2: Security

**Authentication**:
- **Password Storage**: Bcrypt or Argon2 hashing (never plaintext)
- **Password Policy**: Minimum 8 characters (configurable)
- **Session Management**: Secure JWT tokens with refresh mechanism
- **Cookie Security**: httpOnly, secure (HTTPS), SameSite=Strict
- **Session Timeout**: Automatic logout after 30 minutes of inactivity (configurable)

**Authorization**:
- **Role-Based Access Control**: Enforced at API level (not just client-side)
- **Endpoint Protection**: Admin-only endpoints return 403 for staff users
- **Permission Verification**: Every API request verifies user role
- **Token Validation**: JWT signature verified on every request

**Data Protection**:
- **HTTPS**: Required in production (TLS 1.2+)
- **Input Validation**: All user inputs sanitized to prevent injection attacks
- **SQL Injection Prevention**: Parameterized queries (no string concatenation)
- **XSS Prevention**: Output encoding, Content Security Policy headers
- **CSRF Protection**: Anti-CSRF tokens for state-changing operations

**Privacy**:
- **Customer Data**: Phone numbers and addresses treated as sensitive data
- **Access Logging**: Track who accesses customer records (future enhancement)
- **Data Retention**: Customer data retained indefinitely (GDPR not applicable, Indonesia-only)

**Acceptance Criteria**:
- [ ] Passwords hashed with bcrypt/argon2
- [ ] JWT tokens expire and refresh correctly
- [ ] Admin endpoints inaccessible to staff users
- [ ] HTTPS enforced in production
- [ ] No SQL injection vulnerabilities (verified by security testing)
- [ ] No XSS vulnerabilities (verified by security testing)

---

### NFR-3: Reliability

**Uptime**:
- **Availability**: 99% uptime during business hours (8 AM - 8 PM, 7 days/week)
- **Downtime**: Planned maintenance outside business hours
- **Monitoring**: Health check endpoint for uptime monitoring

**Data Integrity**:
- **Database Constraints**: Foreign keys, unique constraints, NOT NULL constraints enforced
- **Transaction Integrity**: Database transactions for multi-step operations (order creation with items)
- **Referential Integrity**: Cascading rules for related data (orders reference customers)

**Error Handling**:
- **Graceful Degradation**: User-friendly error messages (no stack traces to users)
- **Error Logging**: Server-side error logging for debugging
- **Retry Logic**: Automatic retry for transient failures (DB connection, etc.)
- **Fallback UI**: Offline state indication if server unreachable

**Backup & Recovery**:
- **Database Backups**: Daily automated backups
- **Backup Retention**: 30 days of backup history
- **Recovery Time Objective (RTO)**: Restore service within 4 hours
- **Recovery Point Objective (RPO)**: Maximum 24 hours data loss acceptable

**Acceptance Criteria**:
- [ ] 99% uptime during business hours (monthly measurement)
- [ ] Database constraints prevent invalid data
- [ ] Errors displayed as user-friendly messages
- [ ] Daily backups run successfully
- [ ] Can restore from backup within 4 hours

---

### NFR-4: Usability

**Learnability**:
- **Training Time**: New staff can use system within 30 minutes of training
- **Intuitive UI**: Common tasks discoverable without documentation
- **Onboarding**: Optional tutorial/walkthrough on first login (future enhancement)

**Efficiency**:
- **Order Creation**: Complete new order in under 2 minutes
- **Customer Search**: Find existing customer in under 10 seconds
- **Status Update**: Update order status in under 5 seconds

**Error Prevention**:
- **Validation**: Inline validation with helpful error messages
- **Confirmation Dialogs**: For destructive actions (delete service, change payment status)
- **Required Fields**: Clearly marked with asterisks (*)
- **Auto-save**: Consider auto-save for long forms (future enhancement)

**Accessibility**:
- **WCAG Compliance**: Basic WCAG 2.1 Level A compliance
- **Keyboard Navigation**: Tab order logical, Enter key submits forms
- **Screen Reader**: Alt text for images, ARIA labels for icons
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text

**User Feedback**:
- **Loading States**: Spinners/skeletons during data fetch
- **Success Messages**: Toast notifications for successful actions
- **Error Messages**: Clear indication of what went wrong and how to fix
- **Progress Indicators**: Multi-step forms show current step

**Acceptance Criteria**:
- [ ] New staff can create order within 30 minutes of training
- [ ] Order creation completed in under 2 minutes
- [ ] Validation errors are clear and actionable
- [ ] Confirmation dialogs prevent accidental deletions
- [ ] Basic keyboard navigation works
- [ ] Color contrast passes WCAG AA standards

---

### NFR-5: Compatibility

**Browser Support**:
- **Modern Browsers**: Latest versions of Chrome, Firefox, Safari, Edge
- **Browser Versions**: Last 2 major versions supported
- **JavaScript**: ES2020+ features acceptable (no IE11 support needed)

**Screen Sizes**:
- **Desktop**: Optimized for 1024px+ width (primary use case)
- **Tablet**: Responsive design for 768px - 1023px (iPad, Android tablets)
- **Mobile**: Not optimized for mobile phones (<768px) in MVP
- **Minimum Resolution**: 1024×768 (XGA)

**Device Types**:
- **Primary**: Desktop computers (Windows, macOS)
- **Secondary**: Tablets for order taking on shop floor
- **Not Supported**: Mobile phones (future enhancement)

**Operating Systems**:
- **Desktop**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Tablet**: iOS 14+, Android 10+

**Network Conditions**:
- **Minimum Bandwidth**: 5 Mbps for acceptable performance
- **Recommended**: 10 Mbps+ broadband
- **Latency**: Optimized for < 100ms latency to server
- **Offline**: Not supported in MVP (requires internet connection)

**Acceptance Criteria**:
- [ ] Works on Chrome, Firefox, Safari, Edge (latest versions)
- [ ] Responsive design works on desktop and tablet
- [ ] No critical features require mobile-specific functionality
- [ ] Works on standard broadband (10 Mbps)

---

### NFR-6: Maintainability

**Code Quality**:
- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Linting**: ESLint with recommended rules, Prettier for formatting
- **Code Style**: Consistent naming conventions, file structure
- **Comments**: Complex business logic documented with comments

**Testing**:
- **Unit Tests**: Business logic functions tested (target: 70% coverage)
- **Integration Tests**: API endpoints tested
- **E2E Tests**: Critical workflows (order creation, login) tested
- **Test Framework**: Vitest for backend and frontend

**Documentation**:
- **API Documentation**: OpenAPI/Swagger spec for all endpoints (future)
- **Code Documentation**: JSDoc comments for public functions
- **Architecture Docs**: ADRs for major technical decisions (already exists)
- **User Documentation**: User guide for staff training (future)

**Version Control**:
- **Git**: All code in Git repository
- **Branching**: Feature branches, main branch protected
- **Commit Messages**: Conventional Commits format
- **Code Review**: Pull requests required for main branch

**Monitoring & Logging**:
- **Application Logs**: Structured logging (JSON format)
- **Error Tracking**: Centralized error logging (Sentry, LogRocket, etc.)
- **Performance Monitoring**: Track slow queries, API response times
- **Audit Trail**: Log important actions (order creation, status changes)

**Acceptance Criteria**:
- [ ] TypeScript strict mode enabled
- [ ] ESLint and Prettier configured
- [ ] Unit tests for business logic
- [ ] E2E tests for critical workflows
- [ ] Git commit messages follow conventions
- [ ] Application logs structured and searchable

---

## 6. User Interface/UX Requirements

### UI-1: Design Principles

**Clarity**:
- Clear, descriptive labels for all form fields
- Intuitive icons with text labels (not icon-only)
- Consistent terminology throughout the app
- White space for visual separation

**Consistency**:
- Consistent button styles (primary, secondary, danger)
- Consistent color scheme (brand colors)
- Consistent spacing and padding (design system)
- Consistent navigation structure

**Feedback**:
- Loading states for async operations (spinners, skeletons)
- Success messages (green toast notifications)
- Error messages (red toast notifications with details)
- Disabled states for unavailable actions

**Efficiency**:
- Minimal clicks to complete common tasks
- Keyboard shortcuts for power users (future)
- Auto-focus on primary input fields
- Smart defaults (e.g., payment status = unpaid)

**Safety**:
- Confirmation dialogs for destructive actions
- Undo option for reversible actions (future)
- Clear indication of required vs optional fields
- Validation before submission

---

### UI-2: Key Screens

#### Screen 1: Login

**Layout**:
- Centered login card on full-screen background
- Logo and app name at top
- Email and password fields
- "Remember me" checkbox
- "Login" button (primary, full-width)
- Error message area below button

**Fields**:
- Email: `type="email"`, required, autocomplete="username"
- Password: `type="password"`, required, autocomplete="current-password", show/hide toggle
- Remember me: checkbox (optional)

**Validation**:
- Email format validation
- Password minimum 8 characters
- Error message if credentials invalid

**User Flow**:
1. User enters email and password
2. User clicks "Login"
3. System validates credentials
4. If valid: Redirect to dashboard
5. If invalid: Show error message

---

#### Screen 2: Dashboard (Admin)

**Layout**:
- Top navigation bar (logo, menu, user profile)
- Welcome message: "Welcome, [Admin Name]"
- Quick stats row (3-4 cards):
  - Today's Orders: [Count]
  - Pending Payments: [Count]
  - Weekly Revenue: Rp [Amount]
  - Total Customers: [Count]
- Weekly revenue chart (large)
- Weekly order count chart (below revenue)
- Filter controls above charts (date range, payment status)

**Navigation Menu**:
- Dashboard (active)
- Customers
- Orders
- Services (Admin only)
- Analytics (Admin only)
- Settings
- Logout

**Chart Controls**:
- Date range selector (dropdown or date picker)
- Payment status filter (radio buttons: All, Paid, Unpaid)

---

#### Screen 3: Dashboard (Staff)

**Layout**:
- Top navigation bar
- Welcome message: "Welcome, [Staff Name]"
- Quick stats row:
  - Today's Orders: [Count]
  - Pending Payments: [Count]
- Quick action buttons (large, prominent):
  - "+ New Order"
  - "Search Customer"
- Recent orders list (last 10 orders)

**Navigation Menu** (Staff):
- Dashboard (active)
- Customers
- Orders
- ~~Services~~ (hidden)
- ~~Analytics~~ (hidden)
- Settings
- Logout

**Differences from Admin Dashboard**:
- No analytics charts
- Quick action buttons instead
- Recent orders list for quick access

---

#### Screen 4: Customer Search/Registration

**Layout**:
- Page title: "Find or Register Customer"
- Search section:
  - Phone number input (large, auto-focus)
  - "Search" button
- Search results area:
  - If found: Customer profile card
  - If not found: "Customer not found" message + "Register New Customer" button

**Customer Profile Card** (if found):
- Customer name (large)
- Phone number
- Address (if available)
- Total orders (count)
- Recent orders (last 3)
- Actions: "Create Order", "View Details"

**Registration Form** (if not found):
- Phone number (pre-filled from search, read-only)
- Name (required)
- Address (optional, textarea)
- "Register" button

**User Flow**:
1. Staff enters phone number
2. Staff clicks "Search"
3a. If found: Show customer profile
3b. If not found: Show registration form
4. Staff registers new customer or creates order

---

#### Screen 5: New Order Form

**Layout**:
- Page title: "Create New Order"
- Customer section (collapsible after selection):
  - Selected customer: Name, Phone
  - "Change Customer" button
- Service items section:
  - Table with columns: Service, Quantity, Unit, Price, Subtotal, Actions
  - "Add Service Item" button
- Total price (large, prominent): Rp [Amount]
- Payment status: Radio buttons (Paid/Unpaid)
- Actions: "Create Order" (primary), "Cancel" (secondary)

**Service Item Row**:
- Service: Dropdown (active services only)
- Quantity: Number input (decimal allowed)
- Unit: Auto-filled based on service (kg/set)
- Price: Auto-filled from service (read-only)
- Subtotal: Auto-calculated (quantity × price, read-only)
- Remove: Icon button (trash icon)

**Validation**:
- Customer must be selected
- At least 1 service item required
- Quantity > 0 for all items
- Inline validation with error messages

**User Flow**:
1. Staff selects customer (from search)
2. Staff clicks "Add Service Item"
3. Staff selects service from dropdown
4. Staff enters quantity
5. System calculates subtotal and total
6. Staff adds more items if needed
7. Staff selects payment status
8. Staff clicks "Create Order"
9. System validates and creates order
10. Success message + redirect to order details

---

#### Screen 6: Order List

**Layout**:
- Page title: "Orders"
- Filter bar:
  - Order status filter (dropdown or tabs)
  - Payment status filter (dropdown or badges)
  - Date range picker
  - Customer search input
  - "Apply Filters" button
- Order table or card grid:
  - Columns: Order #, Customer, Status, Payment, Total, Date, Actions
  - Sortable headers
- Pagination controls

**Order Row/Card**:
- Order number (bold, clickable)
- Customer name and phone (smaller text)
- Status badge (color-coded)
- Payment badge (color-coded)
- Total price (right-aligned)
- Order date (formatted)
- Actions: "View Details" icon button

**Table View** (desktop):
| Order # | Customer | Status | Payment | Total | Date | Actions |
|---------|----------|--------|---------|-------|------|---------|
| ORD-001 | Budi (+628...) | [Ready] | [Paid] | Rp 65,000 | Feb 9 | 👁️ |

**Card View** (tablet):
```
┌───────────────────────────────────┐
│ ORD-001         [Ready] [Paid]    │
│ Budi (+6281234567890)             │
│ Rp 65,000 • Feb 9, 2026           │
└───────────────────────────────────┘
```

---

#### Screen 7: Order Details

**Layout**:
- Breadcrumb: Orders > Order #ORD-001
- Order header:
  - Order number (large)
  - Status badge
  - Payment badge
  - Created date and staff name
- Three-column layout (or stacked on tablet):
  - **Column 1: Customer Info**
    - Name, Phone, Address
  - **Column 2: Service Items**
    - Table with items and totals
  - **Column 3: Actions**
    - Update Status button
    - Update Payment button
    - Print Receipt button
- Back to Orders button

**Service Items Table**:
| Service | Quantity | Unit | Price | Subtotal |
|---------|----------|------|-------|----------|
| Regular Laundry | 5 | kg | Rp 7,000 | Rp 35,000 |
| Bed Cover | 2 | set | Rp 15,000 | Rp 30,000 |
| **TOTAL** | | | | **Rp 65,000** |

**Action Buttons**:
- "Update Status: [Next Status]" - Primary button, shows next logical status
- "Mark as Paid" / "Mark as Unpaid" - Secondary button, toggles payment
- "Print Receipt" - Secondary button, opens print dialog

---

#### Screen 8: Service Management (Admin Only)

**Layout**:
- Page title: "Service Management"
- "Add Service" button (top right)
- Service table:
  - Columns: Service Name, Price, Unit, Status, Actions
  - Sortable by name or price

**Service Table Row**:
| Service Name | Price | Unit | Status | Actions |
|--------------|-------|------|--------|---------|
| Regular Laundry | Rp 7,000 | kg | Active | ✏️ 🗑️ |

**Add/Edit Service Modal**:
- Modal overlay with form
- Fields:
  - Service Name (text input, required)
  - Price (number input, required, IDR)
  - Unit Type (radio buttons: kg / set, required)
- Actions: "Save", "Cancel"

**Delete Confirmation Modal**:
- Title: "Delete Service?"
- Message: "This service will be hidden but existing orders will be preserved."
- Actions: "Delete" (danger), "Cancel" (secondary)

---

### UI-3: Navigation Structure

**Top Navigation Bar**:
- Left: Logo + App Name ("Laundry Manager")
- Center: Main menu items (Desktop)
- Right: User profile dropdown (Name, Role, Logout)

**Sidebar Navigation** (Alternative):
- Logo at top
- Menu items with icons
- User profile at bottom

**Menu Items**:
- Dashboard (Home icon)
- Customers (Users icon)
- Orders (List icon)
- Services (Package icon) - Admin only
- Analytics (Chart icon) - Admin only
- Settings (Gear icon)

**Mobile Navigation** (Future):
- Hamburger menu
- Bottom tab bar

---

### UI-4: Color Scheme

**Brand Colors**:
- Primary: Blue (#3B82F6)
- Secondary: Gray (#6B7280)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- Info: Light Blue (#06B6D4)

**Status Colors**:
- Received: Blue (#3B82F6)
- In Progress: Yellow (#F59E0B)
- Ready: Purple (#8B5CF6)
- Delivered: Green (#10B981)

**Payment Colors**:
- Paid: Green (#10B981)
- Unpaid: Red (#EF4444)

**Neutral Colors**:
- Background: White (#FFFFFF) or Light Gray (#F9FAFB)
- Text: Dark Gray (#111827)
- Border: Gray (#E5E7EB)

---

### UI-5: Typography

**Font Family**:
- Sans-serif: Inter, Roboto, or system fonts
- Monospace: For order numbers and prices (optional)

**Font Sizes**:
- Heading 1: 2rem (32px) - Page titles
- Heading 2: 1.5rem (24px) - Section titles
- Heading 3: 1.25rem (20px) - Card titles
- Body: 1rem (16px) - Default text
- Small: 0.875rem (14px) - Secondary text
- Tiny: 0.75rem (12px) - Captions

**Font Weights**:
- Regular: 400 - Body text
- Medium: 500 - Labels
- Semibold: 600 - Headings
- Bold: 700 - Important values (total price)

---

## 7. Data Models

### Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│   Users     │────┐    │  Customers   │
│             │    │    │              │
│ - id (PK)   │    │    │ - id (PK)    │
│ - email     │    │    │ - name       │
│ - password  │    │    │ - phone (UK) │
│ - role      │    │    │ - address    │
│ - name      │    │    └──────┬───────┘
└─────────────┘    │           │
                   │           │
                   │           │ 1
                   │ N         │
                   │           │
                   │      ┌────▼──────┐
                   └─────►│  Orders   │
                          │           │
                          │ - id (PK) │
                          │ - order_# │
                          │ - cust_id │
                          │ - status  │
                          │ - payment │
                          │ - total   │
                          │ - created │
                          └────┬──────┘
                               │ 1
                               │
                               │ N
                          ┌────▼──────────┐      ┌─────────────┐
                          │  Order_Items  │──────│  Services   │
                          │               │  N   │             │
                          │ - id (PK)     │      │ - id (PK)   │
                          │ - order_id    │  1   │ - name      │
                          │ - service_id  │◄─────│ - price     │
                          │ - quantity    │      │ - unit_type │
                          │ - price_at_   │      │ - is_active │
                          │ - subtotal    │      └─────────────┘
                          └───────────────┘
```

---

### Customer

**Table Name**: `customers`

**Description**: Stores customer information with phone number as unique identifier.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (UUID v7) |
| `name` | VARCHAR(100) | NOT NULL | Customer full name |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | Normalized phone number (+628XXXXXXXXX) |
| `address` | TEXT | NULLABLE | Customer address (optional) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- Primary key on `id`
- Unique index on `phone`
- Index on `name` for search

**Business Rules**:
- Phone number must be normalized before storage
- Phone number uniqueness enforced at database level
- Cannot delete customer if they have orders (foreign key constraint)

**Example**:
```json
{
  "id": "01933e76-8b42-7890-a1b2-c3d4e5f67890",
  "name": "Budi Santoso",
  "phone": "+6281234567890",
  "address": "Jl. Merdeka No. 123, Jakarta Pusat",
  "created_at": "2026-02-01T10:30:00Z",
  "updated_at": "2026-02-01T10:30:00Z"
}
```

---

### Service

**Table Name**: `services`

**Description**: Catalog of laundry service packages with pricing.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (UUID v7) |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Service name (e.g., "Regular Laundry") |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Price in IDR (e.g., 7000.00) |
| `unit_type` | ENUM('kg', 'set') | NOT NULL | Measurement unit |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- Primary key on `id`
- Unique index on `name`
- Index on `is_active` for filtering active services

**Business Rules**:
- Service name must be unique (case-insensitive)
- Price must be positive
- Soft delete: Set `is_active = false` instead of deleting
- Inactive services hidden from order creation but visible in historical orders

**Example**:
```json
{
  "id": "01933e76-9c53-7890-b1c2-d3e4f5g67891",
  "name": "Regular Laundry",
  "price": 7000.00,
  "unit_type": "kg",
  "is_active": true,
  "created_at": "2026-01-15T08:00:00Z",
  "updated_at": "2026-02-01T09:00:00Z"
}
```

---

### Order

**Table Name**: `orders`

**Description**: Customer orders with status and payment tracking.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (UUID v7) |
| `order_number` | VARCHAR(20) | UNIQUE, NOT NULL | Human-readable order number (ORD-YYYYMMDD-XXX) |
| `customer_id` | UUID | FOREIGN KEY, NOT NULL | Reference to customers.id |
| `status` | ENUM | NOT NULL | Order status: received, in_progress, ready, delivered |
| `payment_status` | ENUM | NOT NULL | Payment status: paid, unpaid |
| `total_price` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Total order price (sum of order items) |
| `created_by` | UUID | FOREIGN KEY, NOT NULL | Reference to users.id (staff who created order) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Order creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Enums**:
- `status`: 'received', 'in_progress', 'ready', 'delivered'
- `payment_status`: 'paid', 'unpaid'

**Indexes**:
- Primary key on `id`
- Unique index on `order_number`
- Index on `customer_id` for customer order history
- Index on `created_by` for staff activity tracking
- Index on `status` for filtering
- Index on `payment_status` for filtering
- Index on `created_at` for date range queries

**Foreign Keys**:
- `customer_id` REFERENCES `customers(id)` ON DELETE RESTRICT
- `created_by` REFERENCES `users(id)` ON DELETE RESTRICT

**Business Rules**:
- Order number auto-generated in format ORD-YYYYMMDD-XXX
- Total price calculated from order items
- Cannot delete customer if they have orders
- Status transitions validated in application logic

**Example**:
```json
{
  "id": "01933e76-ad64-7890-c1d2-e3f4g5h67892",
  "order_number": "ORD-20260209-001",
  "customer_id": "01933e76-8b42-7890-a1b2-c3d4e5f67890",
  "status": "in_progress",
  "payment_status": "unpaid",
  "total_price": 65000.00,
  "created_by": "01933e76-be75-7890-d1e2-f3g4h5i67893",
  "created_at": "2026-02-09T10:30:00Z",
  "updated_at": "2026-02-09T11:15:00Z"
}
```

---

### OrderItem

**Table Name**: `order_items`

**Description**: Junction table linking orders to services with quantity and price snapshot.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (UUID v7) |
| `order_id` | UUID | FOREIGN KEY, NOT NULL | Reference to orders.id |
| `service_id` | UUID | FOREIGN KEY, NOT NULL | Reference to services.id |
| `quantity` | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Quantity (weight in kg or count in sets) |
| `price_at_order` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Price snapshot from service at order creation |
| `subtotal` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | quantity × price_at_order |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- Primary key on `id`
- Index on `order_id` for retrieving order items
- Index on `service_id` for service usage analytics

**Foreign Keys**:
- `order_id` REFERENCES `orders(id)` ON DELETE CASCADE
- `service_id` REFERENCES `services(id)` ON DELETE RESTRICT

**Business Rules**:
- Price snapshot (`price_at_order`) preserves historical pricing
- Subtotal calculated as `quantity × price_at_order`
- Cannot delete service if referenced by order items
- Order items deleted when order is deleted (cascade)

**Example**:
```json
{
  "id": "01933e76-cf86-7890-e1f2-g3h4i5j67894",
  "order_id": "01933e76-ad64-7890-c1d2-e3f4g5h67892",
  "service_id": "01933e76-9c53-7890-b1c2-d3e4f5g67891",
  "quantity": 5.00,
  "price_at_order": 7000.00,
  "subtotal": 35000.00,
  "created_at": "2026-02-09T10:30:00Z"
}
```

---

### User

**Table Name**: `users`

**Description**: Staff and admin users with role-based permissions.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (UUID v7) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email (login credential) |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt/Argon2 hashed password |
| `role` | ENUM('admin', 'staff') | NOT NULL | User role for RBAC |
| `name` | VARCHAR(100) | NULLABLE | User display name (optional) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- Primary key on `id`
- Unique index on `email`
- Index on `role` for filtering

**Business Rules**:
- Email must be unique (case-insensitive)
- Password hashed with bcrypt (cost factor 10) or argon2
- Default role: 'staff'
- Admin role required for service management and analytics

**Example**:
```json
{
  "id": "01933e76-be75-7890-d1e2-f3g4h5i67893",
  "email": "siti@laundry.com",
  "password_hash": "$2b$10$...", // Bcrypt hash
  "role": "staff",
  "name": "Siti Nurhaliza",
  "created_at": "2026-01-15T08:00:00Z",
  "updated_at": "2026-01-15T08:00:00Z"
}
```

---

## 8. Technical Requirements

### Tech Stack

**Backend**:
- **Runtime**: Bun 1.0+ (JavaScript runtime)
- **Language**: TypeScript 5.0+ (strict mode)
- **Framework**: Effect TypeScript for functional programming patterns
- **Database**: PostgreSQL 14+ (preferably 18 for UUID v7 support)
- **ORM**: Drizzle ORM or Kysely (typed SQL query builder)
- **API Style**: REST API with JSON
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod or Effect Schema
- **Testing**: Vitest

**Frontend**:
- **Framework**: TanStack Start (React-based meta-framework)
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS or CSS Modules
- **State Management**: TanStack Query (React Query) + local state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts or Chart.js for analytics
- **Testing**: Vitest + React Testing Library
- **Build Tool**: Vite

**Database**:
- **DBMS**: PostgreSQL 14+
- **Version Control**: Flyway or Drizzle migrations
- **Connection Pooling**: PgBouncer or built-in pooling
- **UUID**: UUID v7 for sortable unique identifiers

**Development Tools**:
- **Package Manager**: Bun or npm
- **Linter**: ESLint with TypeScript plugin
- **Formatter**: Prettier
- **Git**: Version control with conventional commits
- **IDE**: VS Code (recommended)

---

### Development Environment

**Prerequisites**:
- Node.js 18+ OR Bun 1.0+
- PostgreSQL 14+
- Git

**Setup Steps**:
1. Clone repository
2. Install dependencies: `bun install` or `npm install`
3. Set up PostgreSQL database
4. Copy `.env.example` to `.env` and configure
5. Run database migrations: `bun run migrate`
6. Seed initial data: `bun run seed`
7. Start development server: `bun run dev`

**Environment Variables**:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/laundry_db

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
```

---

### Deployment

**Production Environment**:
- **Backend Hosting**: VPS (DigitalOcean, Linode) or cloud (AWS, GCP, Azure)
- **Frontend Hosting**: Vercel, Netlify, or same VPS as backend
- **Database**: Managed PostgreSQL (AWS RDS, DigitalOcean Managed DB) or self-hosted
- **HTTPS**: Required (Let's Encrypt for free SSL)
- **Domain**: Custom domain (optional)

**Backend Deployment**:
- Bun runtime installed on server
- PM2 or systemd for process management
- Nginx reverse proxy for HTTPS and static files
- Environment variables configured
- Database migrations run before deployment

**Frontend Deployment**:
- Static build (`bun run build`)
- Deploy to CDN (Vercel, Netlify) or serve via Nginx
- Environment variables for API URL

**Database Deployment**:
- PostgreSQL 14+ installed and configured
- Regular backups (daily automated)
- Connection pooling (PgBouncer)
- Monitoring and alerts

**CI/CD** (Future):
- GitHub Actions for automated testing
- Automated deployment on merge to main
- Database migrations run automatically
- Rollback strategy for failed deployments

---

### Code Quality

**TypeScript Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  }
}
```

**Linting**:
- ESLint with TypeScript parser
- Rules: Recommended + strict
- Auto-fix on save (VS Code)

**Formatting**:
- Prettier with default config
- Format on save enabled

**Testing**:
- **Unit Tests**: Business logic functions (Effect layers, services)
- **Integration Tests**: API endpoints (Effect runtime)
- **E2E Tests**: Critical user workflows (Playwright)
- **Coverage Target**: 70%+ for business logic

**Code Review**:
- Pull request required for main branch
- At least 1 approval required
- CI checks must pass (linting, tests)

---

### API Specifications

**Base URL**: `/api`

**Authentication**:
- JWT token in `Authorization: Bearer <token>` header
- Refresh token in httpOnly cookie

**Response Format**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null
}
```

**Error Format**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is required",
    "details": { /* field-level errors */ }
  }
}
```

**Endpoints Summary**:
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Logout user
- `GET /api/customers?phone={phone}` - Search customer by phone
- `POST /api/customers` - Register new customer
- `GET /api/customers/:id` - Get customer details
- `GET /api/services` - List active services
- `POST /api/services` - Create service (admin only)
- `PUT /api/services/:id` - Update service (admin only)
- `DELETE /api/services/:id` - Soft delete service (admin only)
- `GET /api/orders` - List orders with filters
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/payment` - Update payment status
- `GET /api/analytics/weekly?startDate={date}&status={paid|unpaid|all}` - Weekly analytics
- `GET /api/receipts/:orderId` - Generate receipt

---

## 9. Success Metrics

### Product KPIs

**Adoption Metrics**:
- **Target**: 80% of staff actively using system within 1 month of deployment
- **Measurement**: Daily active users / Total staff count
- **Success Criteria**: At least 4 out of 5 staff members use system daily

**Efficiency Metrics**:
- **Order Creation Time**: Average time to create new order
  - **Target**: < 2 minutes per order
  - **Measurement**: Time from "New Order" click to "Create Order" submission
  - **Success Criteria**: 90% of orders created within 2 minutes

- **Customer Search Time**: Average time to find existing customer
  - **Target**: < 10 seconds
  - **Measurement**: Time from search input to customer profile display
  - **Success Criteria**: 95% of searches complete within 10 seconds

**Accuracy Metrics**:
- **Price Calculation Accuracy**: Percentage of orders with correct total price
  - **Target**: 99.9% accuracy
  - **Measurement**: Manual audit of 100 random orders
  - **Success Criteria**: Zero calculation errors found

**Usage Metrics**:
- **System Usage Rate**: Percentage of orders created through system (vs manual)
  - **Target**: 100% digital order tracking
  - **Measurement**: Orders in system / Total orders (reported by staff)
  - **Success Criteria**: No manual order records maintained

---

### Business Metrics

**Revenue Visibility**:
- **Target**: 100% of transactions tracked digitally
- **Measurement**: Revenue in system / Total reported revenue
- **Success Criteria**: All revenue visible in analytics dashboard

**Payment Collection**:
- **Target**: 20% reduction in unpaid orders (compared to manual system)
- **Measurement**: Unpaid order rate after 1 month vs historical data
- **Success Criteria**: Unpaid order percentage decreases from baseline

**Customer Retention**:
- **Target**: Improved customer retention through better service tracking
- **Measurement**: Repeat customer rate (orders from existing customers)
- **Success Criteria**: 60%+ of orders from repeat customers

**Time Savings**:
- **Target**: 30% reduction in administrative time
- **Measurement**: Staff survey on time spent on order management
- **Success Criteria**: Staff report significant time savings

---

### Technical Metrics

**Uptime**:
- **Target**: 99% availability during business hours (8 AM - 8 PM, 7 days/week)
- **Measurement**: Uptime monitoring (UptimeRobot, Pingdom)
- **Success Criteria**: < 7.2 hours downtime per month

**Performance**:
- **Page Load Time**: Average time to first contentful paint
  - **Target**: < 2 seconds on 10 Mbps connection
  - **Measurement**: Chrome DevTools, Lighthouse
  - **Success Criteria**: Lighthouse performance score > 80

- **API Response Time**: P95 response time for API calls
  - **Target**: < 500ms
  - **Measurement**: Application performance monitoring (APM)
  - **Success Criteria**: 95% of requests complete within 500ms

**Error Rate**:
- **Target**: < 1% of requests result in errors
- **Measurement**: Error rate in application logs
- **Success Criteria**: Error rate consistently below 1%

**User Satisfaction**:
- **Target**: 4+ star rating from staff
- **Measurement**: User survey after 1 month
- **Success Criteria**: Average rating ≥ 4.0 / 5.0

---

### Analytics Dashboard Metrics

**Weekly Revenue Tracking**:
- Trend: Revenue increasing week-over-week
- Goal: Identify growth or decline patterns

**Order Volume Tracking**:
- Trend: Order count stable or increasing
- Goal: Understand demand patterns

**Payment Status Monitoring**:
- Paid Order Rate: % of orders that are paid
- Goal: Minimize unpaid order percentage

---

## 10. Assumptions & Constraints

### Assumptions

**User Assumptions**:
- Staff have basic computer literacy (can type, use mouse, navigate web browsers)
- Staff have access to desktop computers or tablets during work hours
- Reliable internet connection available at laundry shop (minimum 5 Mbps)
- Staff trained on system within 30 minutes before first use

**Business Assumptions**:
- Single location/branch initially (no multi-branch support in MVP)
- Standard receipt printers available for printing (thermal or inkjet)
- Indonesian phone number format (+62XXXXXXXXX) for all customers
- Currency is Indonesian Rupiah (IDR) exclusively
- Business operates 7 days/week during consistent hours

**Technical Assumptions**:
- Modern web browsers available (Chrome, Firefox, Safari, Edge)
- JavaScript enabled in browsers
- Cookies and local storage allowed for session management
- HTTPS available for production deployment
- PostgreSQL database accessible from application server

---

### Business Constraints

**MVP Scope Limitations**:
- **Single Location Only**: No multi-branch or franchise support
- **Web-Only**: No mobile app (native iOS/Android)
- **Manual Notifications**: No automated SMS/email notifications to customers
- **Cash/Manual Payment Only**: No online payment gateway integration
- **No Customer Portal**: Customers cannot log in or track orders themselves
- **Basic Analytics Only**: Weekly trends only, no advanced business intelligence

**Budget Constraints**:
- Limited budget for third-party services (prefer open-source tools)
- Self-hosted preferred over expensive SaaS
- Minimal cloud infrastructure costs

**Timeline Constraints**:
- MVP delivery within 3 months
- Iterative development with weekly releases
- Must be usable by staff within 1 month

---

### Technical Constraints

**Database Constraints**:
- **DBMS**: PostgreSQL required (no MySQL, SQLite, etc.)
- **UUID v7**: Preferred but can fallback to UUID v4
- **Data Retention**: No automatic data deletion (store all historical data)
- **Timezone**: Server timezone must be WIB (Western Indonesia Time, UTC+7)

**Browser Constraints**:
- **Modern Browsers Only**: No IE11 support required
- **JavaScript Required**: No-JS fallback not necessary
- **ES2020+ Features**: Can use modern JavaScript (async/await, optional chaining, etc.)

**Infrastructure Constraints**:
- **HTTPS Required**: Production deployment must use HTTPS
- **Backend and Frontend**: Can be hosted on same server or separately
- **Database Access**: Backend must have direct PostgreSQL access (no ORM-only solutions)

**Security Constraints**:
- **Password Hashing**: Must use bcrypt or argon2 (no MD5, SHA1)
- **Session Management**: JWT tokens with httpOnly cookies
- **CORS**: Properly configured for frontend-backend communication
- **SQL Injection Prevention**: Parameterized queries mandatory

---

## 11. Future Enhancements (Out of Scope for MVP)

### Phase 2 Features (3-6 Months)

**Customer Portal**:
- Customers can register and log in
- Track order status in real-time
- View order history
- Receive digital receipts via email

**SMS Notifications**:
- Automated SMS when order status changes:
  - "Your laundry is ready for pickup"
  - "Your order has been delivered"
- SMS reminder for unpaid orders
- Integration with SMS gateway (Twilio, Vonage, local provider)

**Multi-Location Support**:
- Manage multiple laundry branches
- Branch-specific orders and customers
- Inter-branch transfers
- Centralized admin dashboard across branches

**Inventory Management**:
- Track detergent, fabric softener, supplies
- Low stock alerts
- Automatic reorder reminders
- Supplier management

**Employee Management**:
- Staff scheduling and shift management
- Performance tracking (orders per staff, revenue per staff)
- Commissions and payroll integration
- Clock-in/clock-out tracking

---

### Phase 3 Features (6-12 Months)

**Mobile Applications**:
- Native iOS app for staff
- Native Android app for staff
- Customer mobile app (iOS and Android)
- Push notifications for order updates

**Delivery Tracking**:
- Integration with delivery services (GoSend, GrabExpress)
- Real-time delivery tracking
- Delivery fee calculation
- Delivery status updates

**Loyalty Program**:
- Points system for repeat customers
- Rewards and discounts
- Referral program
- Customer tiers (Bronze, Silver, Gold)

**Advanced Analytics**:
- Customer lifetime value (CLV)
- Churn analysis and retention metrics
- Service popularity and profitability
- Predictive analytics (demand forecasting)
- Custom reports and exports (CSV, PDF)

**Payment Gateway Integration**:
- Online payment via e-wallets (GoPay, OVO, Dana)
- Bank transfer (virtual accounts)
- Credit/debit card payments
- Payment reconciliation and accounting integration

---

### Technical Improvements

**Real-Time Updates**:
- WebSocket integration for live order status
- Real-time dashboard updates
- Collaborative editing (multiple staff viewing same order)

**Offline Support**:
- Progressive Web App (PWA) capabilities
- Offline order creation with sync when online
- Service worker for caching

**Advanced Search**:
- Elasticsearch for fuzzy search
- Search by customer name, address, order items
- Autocomplete suggestions
- Search filters and facets

**Reporting Engine**:
- Customizable report builder
- Scheduled reports (daily, weekly, monthly)
- Email reports to admin
- Export to Excel, PDF

**API for Partners**:
- Public REST API for integrations
- Webhook support for order events
- API documentation (OpenAPI/Swagger)
- API rate limiting and authentication

---

## 12. Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Order** | A laundry job submitted by a customer, containing one or more services |
| **Service** | A type of laundry work (e.g., regular wash, express wash, bed cover cleaning) |
| **Order Item** | An individual service within an order, with specific quantity and pricing |
| **Price Snapshot** | Historical price stored in order_items.price_at_order to preserve pricing at order creation time |
| **Soft Delete** | Marking a database record as inactive (is_active = false) instead of permanently deleting it |
| **UUID v7** | Time-ordered universally unique identifier (contains timestamp for sorting) |
| **RBAC** | Role-Based Access Control - permission system based on user roles (admin, staff) |
| **JWT** | JSON Web Token - secure token for authentication and session management |
| **Effect TypeScript** | Functional programming library for TypeScript providing error handling and composition patterns |

---

### Abbreviations

| Abbreviation | Full Term |
|--------------|-----------|
| **PRD** | Product Requirements Document |
| **MVP** | Minimum Viable Product |
| **API** | Application Programming Interface |
| **REST** | Representational State Transfer |
| **CRUD** | Create, Read, Update, Delete |
| **UI** | User Interface |
| **UX** | User Experience |
| **KPI** | Key Performance Indicator |
| **WCAG** | Web Content Accessibility Guidelines |
| **HTTPS** | Hypertext Transfer Protocol Secure |
| **SSL/TLS** | Secure Sockets Layer / Transport Layer Security |
| **IDR** | Indonesian Rupiah |
| **SMS** | Short Message Service |
| **PWA** | Progressive Web App |

---

### References

**Internal Documentation**:
- `/CLAUDE.md` - Project overview and business requirements
- `/docs/ADR_BACKEND.md` - Backend architectural decisions (Effect TypeScript, PostgreSQL, UUID v7)
- `/docs/backend_roadmap/ROADMAP_BACKEND.md` - Backend implementation roadmap

**External Resources**:
- [Effect TypeScript Documentation](https://www.effect.website/)
- [TanStack Start Documentation](https://tanstack.com/start)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [UUID v7 Specification](https://www.ietf.org/archive/id/draft-peabody-dispatch-new-uuid-format-04.html)

---

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-09 | Development Team | Initial PRD creation - comprehensive product requirements for MVP |

---

### Approval

**Pending Approval From**:
- [ ] Product Owner
- [ ] Development Lead
- [ ] Business Stakeholder
- [ ] QA Lead

**Approval Date**: _________________

**Approved By**: _________________

---

## Document Control

**Document Location**: `/docs/PRD.md`

**Version Control**: Managed in Git repository

**Change Request Process**:
1. Propose change via pull request
2. Review with stakeholders
3. Update revision history
4. Merge to main branch

**Related Documents**:
- Architecture Decision Records (ADRs)
- Technical Specification Document (TSD)
- User Stories and Backlog
- Test Plans

---

*End of Product Requirements Document*
