# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Laundry management web application for managing customers, orders, services, and payments with analytics dashboard.

**Tech Stack:**
- Backend: Effect TypeScript
- Frontend: TanStack Start (React framework)
- Database: PostgreSQL
- Target Platform: Web only

## Architecture

### Domain Model

The application is built around these core entities:

1. **Users** (Staff/Admin) - Authentication and authorization
2. **Customers** - Identified by phone number (unique identifier)
3. **Services** - Laundry service packages (e.g., regular/express laundry, bed covers) with price and unit type (kg/set)
4. **Orders** - Customer orders containing multiple service items
5. **Order Items** - Junction between orders and services with quantity and pricing snapshot

### User Roles & Permissions

- **Admin**: Full access including service management and analytics
- **Staff**: Create orders, manage customers, process payments (no service management)
- **Customers**: No system access (staff-managed workflow)

### Order Workflow

Orders progress through distinct statuses:
```
Received → In Progress → Ready → Delivered
```

Payment can occur at two points:
- Immediately at order creation (status: paid)
- Later when laundry is ready (status: unpaid → paid)

### Key Business Rules

- **Customer Identification**: Phone number is the unique identifier for customers
- **First-Time Check**: System must verify if customer exists before registration
- **Price Calculation**: Total = sum of (service_price × weight/quantity) for each order item
- **Price Snapshot**: Order items store `price_at_order` to preserve pricing even if service prices change later
- **Service Units**: Services can be measured in kg (weight) or set (count)

## Database Schema

Key relationships:
- `orders.customer_id` → `customers.id`
- `orders.created_by` → `users.id`
- `order_items.order_id` → `orders.id`
- `order_items.service_id` → `services.id`

Order items store denormalized pricing (`price_at_order`, `subtotal`) to maintain historical accuracy.

## API Endpoints

**Authentication:**
- `POST /api/auth/login`, `POST /api/auth/logout`

**Customers:**
- `GET /api/customers?phone={phone}` - Search by phone
- `POST /api/customers` - Register new customer
- `GET /api/customers/:id`

**Services (Admin only for CUD operations):**
- `GET /api/services`
- `POST /api/services`, `PUT /api/services/:id`, `DELETE /api/services/:id`

**Orders:**
- `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/payment` - Update payment status

**Analytics:**
- `GET /api/analytics/weekly?startDate={date}&status={paid|unpaid|all}`

**Receipts:**
- `GET /api/receipts/:orderId`

## Frontend Routes

- `/login` - Authentication
- `/dashboard` - Main dashboard with weekly analytics charts
- `/customers/search` - Customer lookup and registration
- `/orders/new` - Order creation workflow
- `/orders` - Order list view
- `/orders/:id` - Order details
- `/services` - Service management (Admin only)
- `/settings` - User settings

## Analytics Requirements

Weekly transaction visualization showing:
- Total revenue (IDR)
- Order count

Filterable by:
- Successful transactions (paid orders only)
- Pending transactions (unpaid orders only)
- Both (combined view)

Display as graph/chart with weekly trends.

## Critical Implementation Notes

### Effect TypeScript Backend

Use Effect-TS patterns for:
- Error handling and failure modeling
- Service layer composition
- Database operations with proper effect lifting
- Authentication/authorization middleware

### Domain Model Placement

- **ALWAYS place data models (request/response types, DTOs) in the domain layer** (`/backend/src/domain/`)
- **NEVER define data models inside application layer use cases** (`/backend/src/application/`)
- Use cases should only contain business logic, importing models from the domain layer
- Group related domain models by feature (e.g., `Auth.ts`, `User.ts`, `Order.ts`, `Customer.ts`)

### Database Query Guidelines

**CRITICAL: NEVER use `SELECT *` in SQL queries**

- **ALWAYS specify explicit column lists** in all queries
- This is a strict architectural rule for performance, security, and maintainability

**Rationale:**
- **Performance**: Reduces data transfer by selecting only needed columns
- **Security**: Prevents accidentally exposing sensitive data (e.g., password hashes)
- **Maintainability**: Makes schema changes explicit and traceable
- **Type Safety**: Provides clear mapping between database columns and TypeScript types
- **Evolution**: Easier to track which queries are affected by schema changes

**Examples:**
```typescript
// ❌ WRONG - Never use SELECT *
sql<Customer>`SELECT * FROM customers WHERE phone = ${phone}`

// ✅ CORRECT - Always list explicit columns
sql<Customer>`
  SELECT id, name, phone, address, created_at, updated_at
  FROM customers
  WHERE phone = ${phone}
`

// ✅ CORRECT - Create specialized models for column subsets
sql<CustomerSummary>`
  SELECT id, name, phone
  FROM customers
  ORDER BY name ASC
`

// ✅ CORRECT - Explicit RETURNING clauses for INSERT/UPDATE
sql<Customer>`
  INSERT INTO customers (name, phone, address)
  VALUES (${name}, ${phone}, ${address})
  RETURNING id, name, phone, address, created_at, updated_at
`
```

**Specialized Models:**
- Create dedicated domain models for queries returning column subsets
- Examples: `UserBasicInfo`, `CustomerSummary`, `OrderSummary`, `ActiveServiceInfo`
- Place these models in the appropriate domain file alongside the main entity

### Customer Phone Number Handling

- Phone numbers must be validated and normalized before storage
- Search should handle variations in phone number format
- Uniqueness constraint enforced at database level

### Service Management

When deleting services, handle existing orders gracefully:
- Consider soft delete (is_active flag) instead of hard delete
- Preserve service information in order_items via denormalization

### Receipt Generation

Receipts must include:
- Order details (order number, date, status)
- Customer info (name, phone)
- Service items with quantities and prices
- Total price
- Payment status

### Authorization Middleware

Protect admin-only routes:
- Service CRUD operations (except GET)
- Analytics dashboard access

Staff should have access to:
- Customer management
- Order creation and updates
- Payment processing

## Development Workflow

### Git Workflow

**Branch Management**:
- **NEVER push changes directly to the master branch**
- **ALWAYS create a new branch for any changes**

**Standard workflow**:
1. Create a new branch from master with a descriptive name: `git checkout -b feature/your-feature-name master`
2. Make your changes and commit them
3. Push the branch to remote: `git push -u origin your-branch-name`
4. Create a pull request for review and merging

**Branch naming conventions**:
- `feature/` - For new features
- `fix/` - For bug fixes
- `refactor/` - For code refactoring
- `docs/` - For documentation updates
- `chore/` - For maintenance tasks

### Planning for Non-Trivial Work

Before implementing non-trivial features or changes, create a plan document:
- **Location**: `docs/plans/<NAME>_<DATE>.md`
- **Naming**: Use descriptive name and date (e.g., `order_workflow_20260209.md`)
- **Purpose**: Document approach, gather context, and get alignment before implementation

**When to create a plan**:
- New feature implementation
- Significant refactoring
- Architectural changes
- Multi-file modifications
- Changes requiring stakeholder approval

**Plan should include**:
- Overview and context
- Current state analysis
- Proposed approach
- Implementation steps
- Success criteria
- Potential risks and alternatives

## Agents

When working with Effect TypeScript code, use the Effect coder agent for guidance:
- **Location**: `/.claude/agents/effect-coder.md`
- **Usage**: Consult this agent for Effect patterns, best practices, and setup

## Documentation Structure

**Core Documentation**:
- `/CLAUDE.md` - Project overview and development guidelines (this file)
- `/docs/PRD.md` - Product Requirements Document (comprehensive product spec)
- `/docs/ADR_BACKEND.md` - Backend architectural decisions
- `/docs/PRD_PLAN.md` - PRD planning and structure outline
- `/docs/CONTEXT.md` - Project context and background information

**Backend Roadmap**:
- `/docs/backend_roadmap/` - Directory containing all backend implementation roadmaps
- `/docs/backend_roadmap/ROADMAP_BACKEND.md` - Main backend implementation roadmap

**Plans** (for non-trivial work):
- `/docs/plans/` - Directory for planning documents before implementation

**Agents**:
- `/.claude/agents/effect-coder.md` - Effect TypeScript setup and patterns guide
