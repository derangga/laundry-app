# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Laundry management web application for managing customers, orders, services, and payments with analytics dashboard.

**Tech Stack:**
- Backend: Effect TypeScript
- Frontend: TanStack Start (React framework)
- Database: PostgreSQL
- Target Platform: Web only

**Documentation Reference:**
- **[PRD.md](docs/PRD.md)** - Product requirements, API specs, and frontend routes
- **[ADR_BACKEND.md](docs/ADR_BACKEND.md)** - Backend architectural decisions and database schema
- **[CONTEXT.md](docs/CONTEXT.md)** - Technical implementation patterns and code examples
- **[Effect Coder Agent](.claude/agents/effect-coder.md)** - Effect TypeScript patterns and best practices

## Core Domain

The application is built around these core entities:

1. **Users** (Staff/Admin) - Authentication and authorization
2. **Customers** - Identified by phone number (unique identifier)
3. **Services** - Laundry service packages (e.g., regular/express laundry, bed covers) with price and unit type (kg/set)
4. **Orders** - Customer orders containing multiple service items
5. **Order Items** - Junction between orders and services with quantity and pricing snapshot

### User Roles

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

## Critical Coding Guidelines

### Domain Model Placement

- **ALWAYS place data models (request/response types, DTOs) in the domain layer** (`/backend/src/domain/`)
- **NEVER define data models inside application layer use cases** (`/backend/src/application/`)
- Use cases should only contain business logic, importing models from the domain layer
- Group related domain models by feature (e.g., `Auth.ts`, `User.ts`, `Order.ts`, `Customer.ts`)

### Database Query Rule

**CRITICAL: NEVER use `SELECT *` in SQL queries**

- **ALWAYS specify explicit column lists** in all queries
- This is a strict architectural rule for performance, security, and maintainability
- Prevents accidentally exposing sensitive data (e.g., password hashes)
- Makes schema changes explicit and easier to track

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

### Effect TypeScript

Use Effect-TS patterns for:
- Error handling and failure modeling
- Service layer composition
- Database operations with proper effect lifting
- Authentication/authorization middleware

For detailed patterns and examples, see:
- **[CONTEXT.md](docs/CONTEXT.md)** - Service pattern, layer composition, route handlers, middleware
- **[Effect Coder Agent](.claude/agents/effect-coder.md)** - Setup and best practices

## Development Workflow

### Git Workflow

**Branch Management:**
- **NEVER push changes directly to the master branch**
- **ALWAYS create a new branch for any changes**

**Standard workflow:**
1. Create a new branch from master with a descriptive name: `git checkout -b feature/your-feature-name master`
2. Make your changes and commit them
3. Push the branch to remote: `git push -u origin your-branch-name`
4. Create a pull request for review and merging

**Branch naming conventions:**
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

**When to create a plan:**
- New feature implementation
- Significant refactoring
- Architectural changes
- Multi-file modifications
- Changes requiring stakeholder approval

**Plan should include:**
- Overview and context
- Current state analysis
- Proposed approach
- Implementation steps
- Success criteria
- Potential risks and alternatives
