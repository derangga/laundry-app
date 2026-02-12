import { Schema } from 'effect'
import { Customer, CreateCustomerInput } from '@domain/Customer'

/**
 * Customer API Schema Definitions
 *
 * Defines the request/response schemas for customer management endpoints:
 * - GET / - Search customer by phone (query parameter)
 * - POST / - Create new customer
 * - GET /:id - Get customer by ID
 *
 * These definitions are used for:
 * - API documentation generation
 * - Type-safe client generation
 * - Request/response validation
 * - OpenAPI schema export (future)
 */

export const CustomerApiEndpoints = {
  searchByPhone: {
    method: 'GET',
    path: '/',
    queryParams: Schema.Struct({
      phone: Schema.String,
    }),
    response: Customer,
  },
  create: {
    method: 'POST',
    path: '/',
    payload: CreateCustomerInput,
    response: Customer,
    status: 201,
  },
  getById: {
    method: 'GET',
    path: '/:id',
    response: Customer,
  },
} as const
