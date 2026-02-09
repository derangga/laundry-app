# Plan: Laundry Management Application PRD

## Overview

Create a comprehensive Product Requirements Document (PRD) for a laundry management web application with order tracking, customer management, payment processing, and analytics
dashboard.

## Requirements Summary

### Technology Stack

- **Backend**: Effect TypeScript
- **Frontend**: Tanstack Start (React framework)
- **Database**: PostgreSQL
- **Platform**: Web application only

### User Roles

1. **Admin**: Full system access, manage services, view analytics
2. **Staff**: Create orders, manage customers, process payments
3. **Customers**: No system access (staff-managed only)

### Core Features

#### 1. Customer Management

- Identify customers by phone number (unique identifier)
- Store: name and phone number
- First-time customer check and registration
- Lookup existing customers by phone

#### 2. Service Package Management (Admin)

- Initial services:
- Regular laundry: IDR 7,000/kg
- Express laundry: IDR 10,000/kg
- Bed cover (1 set): IDR 15,000/set
- Admin can add, edit, delete services via UI
- Track: service name, price, unit type (kg or set)

#### 3. Order Management

- Create orders for new/existing customers
- Select multiple services per order
- Staff weighs items and enters weight
- Calculate total price based on services and weight
- Order statuses: Received → In Progress → Ready → Delivered
- Track: customer info, services, weight, total price, order date, status

#### 4. Payment Processing

- Payment timing options:
- Pay immediately (at order creation)
- Pay later (when laundry is ready)
- Payment status: Paid / Unpaid
- Simple status tracking only (no payment method or transaction history)

#### 5. Analytics Dashboard

- Weekly transaction visualization
- Display both metrics:
- Total revenue (in IDR)
- Order count
- Filter options:
- Successful transactions (Paid orders)
- Pending transactions (Unpaid orders)
- Both (combined view)
- Graph/chart representation of weekly trends

#### 6. Receipt Printing

- Generate and print receipts for customers
- Include: order details, services, weight, price, payment status

## PRD Document Structure

The PRD will be created at `/docs/PRD.md` with the following sections:

### 1. Document Information

- Title, version, date, author
- Document status and approval

### 2. Executive Summary

- Product vision and goals
- Target users
- Key value propositions

### 3. Product Overview

- Background and context
- Problem statement
- Solution overview

### 4. User Personas & Use Cases

- Admin persona and workflows
- Staff persona and workflows
- Customer journey (offline)

### 5. Functional Requirements

Detailed breakdown of each feature:

- FR-1: Authentication & Authorization
- FR-2: Customer Management
- FR-3: Service Package Management
- FR-4: Order Management
- FR-5: Payment Processing
- FR-6: Analytics Dashboard
- FR-7: Receipt Generation

### 6. Non-Functional Requirements

- Performance requirements
- Security requirements
- Scalability considerations
- Browser compatibility

### 7. User Interface/UX Requirements

- Key screens and navigation
- Responsive design requirements
- Accessibility considerations

### 8. Data Models

- Customer entity
- Service entity
- Order entity
- Payment entity
- User entity (Staff/Admin)

### 9. Technical Requirements

- Technology stack details
- Development environment setup
- Deployment considerations

### 10. Success Metrics

- Key performance indicators (KPIs)
- User adoption metrics
- Business metrics

### 11. Assumptions & Constraints

- Technical assumptions
- Business assumptions
- Known constraints

### 12. Future Enhancements (Out of Scope for MVP)

- Customer portal with login
- SMS/Email notifications
- Multi-location support
- Inventory management
- Mobile application

### 13. Appendix

- Glossary of terms
- References
- Revision history

## File Organization

```
/docs
├── PRD.md                    # Main PRD document
└── README.md                 # Docs folder index (optional)
```

## Critical Implementation Details

### Database Schema (PostgreSQL)

**users** table:

- id (UUID, PK)
- name (VARCHAR)
- phone_number (VARCHAR, UNIQUE)
- role (ENUM: 'admin', 'staff')
- password_hash (VARCHAR)
- created_at (TIMESTAMP)

**customers** table:

- id (UUID, PK)
- name (VARCHAR)
- phone_number (VARCHAR, UNIQUE)
- created_at (TIMESTAMP)

**services** table:

- id (UUID, PK)
- name (VARCHAR)
- price (DECIMAL)
- unit (ENUM: 'kg', 'set')
- is_active (BOOLEAN)
- created_at (TIMESTAMP)

**orders** table:

- id (UUID, PK)
- customer_id (UUID, FK → customers.id)
- order_number (VARCHAR, UNIQUE)
- status (ENUM: 'received', 'in_progress', 'ready', 'delivered')
- total_price (DECIMAL)
- payment_status (ENUM: 'paid', 'unpaid')
- weight (DECIMAL, nullable)
- order_date (TIMESTAMP)
- completed_date (TIMESTAMP, nullable)
- created_by (UUID, FK → users.id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**order_items** table:

- id (UUID, PK)
- order_id (UUID, FK → orders.id)
- service_id (UUID, FK → services.id)
- quantity (DECIMAL)
- price_at_order (DECIMAL)
- subtotal (DECIMAL)

### API Endpoints (Effect TypeScript Backend)

**Authentication:**

- POST /api/auth/login
- POST /api/auth/logout

**Customers:**

- GET /api/customers?phone={phone}
- POST /api/customers
- GET /api/customers/:id

**Services:**

- GET /api/services
- POST /api/services (Admin only)
- PUT /api/services/:id (Admin only)
- DELETE /api/services/:id (Admin only)

**Orders:**

- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- PUT /api/orders/:id/status
- PUT /api/orders/:id/payment

**Analytics:**

- GET /api/analytics/weekly?startDate={date}&status={paid|unpaid|all}

**Receipts:**

- GET /api/receipts/:orderId (returns PDF or HTML)

### Frontend Routes (Tanstack Start)

- `/login` - Staff/Admin login
- `/dashboard` - Main dashboard with weekly analytics
- `/customers/search` - Search and add customers
- `/orders/new` - Create new order
- `/orders` - List all orders
- `/orders/:id` - Order details
- `/services` - Manage services (Admin only)
- `/settings` - User settings

## Verification & Testing

After implementation, verify:

1. **Customer Management**

- Add new customer with phone number
- Search for existing customer by phone
- Prevent duplicate phone numbers

2. **Order Creation**

- Create order for new customer
- Create order for existing customer
- Select multiple services
- Enter weight and calculate price correctly

3. **Service Management (Admin)**

- Add new service with price and unit
- Edit existing service
- Delete service (should handle existing orders gracefully)

4. **Payment Processing**

- Create order with "Pay Now" (status: paid)
- Create order with "Pay Later" (status: unpaid)
- Update payment status from unpaid to paid

5. **Order Workflow**

- Update order status through all stages
- Track order progression: Received → In Progress → Ready → Delivered

6. **Analytics Dashboard**

- View weekly revenue graph
- View weekly order count graph
- Filter by paid/unpaid/all orders
- Verify data accuracy

7. **Receipt Printing**

- Generate receipt for order
- Print receipt with all order details
- Verify calculations and formatting

8. **Authentication & Authorization**

- Staff login access
- Admin login access
- Admin-only features blocked for staff
- Protected routes require authentication

## Notes

- PRD should be written in clear, non-technical language where possible
- Use tables and diagrams to illustrate complex concepts
- Include mockup descriptions for key screens (actual mockups optional)
- Prioritize requirements clearly (Must Have, Should Have, Nice to Have)
- Keep the document maintainable and easy to update as requirements evolve
