import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CreateCustomerInput, Customer, CustomerId } from '@domain/Customer'
import { createMockSqlClient } from 'test/repositories/testUtils'

describe('CustomerService', () => {
  // Test data factory
  const createTestCustomer = (id: string, phone: string, overrides?: Partial<Customer>): Customer =>
    ({
      id: id as CustomerId,
      name: 'Test Customer',
      phone,
      address: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      ...overrides,
    }) as unknown as Customer

  // Create CustomerService layer manually to avoid SQL dependencies
  const createServiceLayer = (
    customers: Customer[],
    filterFn?: (customer: Customer) => boolean
  ) => {
    const mockSql = filterFn
      ? createMockSqlClient({ rows: customers, filterFn })
      : createMockSqlClient({ rows: customers })
    return Layer.mergeAll(CustomerService.Default.pipe(Layer.provide(mockSql)))
  }

  const createServiceNewRowLayer = (customers: Customer[], newRow: Customer) => {
    const mockSql = createMockSqlClient({ rows: customers, newRow })
    return Layer.mergeAll(CustomerService.Default.pipe(Layer.provide(mockSql)))
  }

  // Test customers
  const existingCustomer = createTestCustomer('customer-1', '+6281234567890', { name: 'John Doe' })
  const customers = [existingCustomer]

  describe('findByPhone', () => {
    it('should find customer successfully with valid phone number', async () => {
      const service = createServiceLayer(customers)
      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.findByPhone('+6281234567890')
      })

      const result = await Effect.runPromise(Effect.provide(program, service))

      expect(result.id).toBe('customer-1')
      expect(result.name).toBe('John Doe')
      expect(result.phone).toBe('+6281234567890')
    })

    it('should fail with CustomerNotFound when phone not registered', async () => {
      const phone = '+6289876543210'
      const serviceLayer = createServiceLayer(customers, (c) => c.phone === phone)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.findByPhone(phone)
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('checkExists', () => {
    it('should return true when customer exists', async () => {
      const serviceLayer = createServiceLayer(customers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.checkExists('+6281234567890')
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result).toBe(true)
    })

    it('should return false when customer does not exist', async () => {
      const phone = '+6289876543210'
      const serviceLayer = createServiceLayer(customers, (c) => c.phone === phone)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.checkExists(phone)
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result).toBe(false)
    })
  })

  describe('create', () => {
    it('should create customer successfully with valid data', async () => {
      const emptyCustomers: Customer[] = []
      const newCustomer = createTestCustomer('customer-1', '+6285555666777', { name: 'Jane Doe' })
      const serviceLayer = createServiceNewRowLayer(emptyCustomers, newCustomer)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create(
          CreateCustomerInput.make({
            name: 'Jane Doe',
            phone: '+6285555666777',
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))
      console.log('new: ', result)
      expect(result.name).toBe('Jane Doe')
      expect(result.phone).toBe('+6285555666777')
      expect(result.address).toBeNull()
    })

    it('should create customer with address', async () => {
      const emptyCustomers: Customer[] = []
      const newCustomer = createTestCustomer('customer-2', '+6285555666888', {
        name: 'Bob Smith',
        address: '123 Main Street, Jakarta',
      })
      const serviceLayer = createServiceNewRowLayer(emptyCustomers, newCustomer)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create({
          name: 'Bob Smith',
          phone: '+6285555666888',
          address: '123 Main Street, Jakarta',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.name).toBe('Bob Smith')
      expect(result.phone).toBe('+6285555666888')
      expect(result.address).toBe('123 Main Street, Jakarta')
    })

    it('should fail with CustomerAlreadyExists when phone already registered', async () => {
      const serviceLayer = createServiceLayer(customers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create(
          CreateCustomerInput.make({
            name: 'Another User',
            phone: '+6281234567890',
          })
        )
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should normalize phone number from 08xx to +628xx format', async () => {
      const emptyCustomers: Customer[] = []
      const newCustomer = createTestCustomer('customer-3', '+6285551234567', {
        name: 'Phone Normalized User',
      })
      const serviceLayer = createServiceNewRowLayer(emptyCustomers, newCustomer)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create(
          CreateCustomerInput.make({
            name: 'Phone Normalized User',
            phone: '085551234567',
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      // Input "085551234567" has 11 digits, after normalization becomes "+6285551234567" (10 digits after +62)
      expect(result.phone).toBe('+6285551234567')
    })

    it('should normalize phone number with dashes and spaces', async () => {
      const emptyCustomers: Customer[] = []
      const newCustomer = createTestCustomer('customer-4', '+628551234567890', {
        name: 'Formatted Phone User',
      })
      const serviceLayer = createServiceNewRowLayer(emptyCustomers, newCustomer)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create(
          CreateCustomerInput.make({
            name: 'Formatted Phone User',
            phone: '+628-5512-3456-7890',
          })
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.phone).toBe('+628551234567890')
    })

    it('should fail with InvalidPhoneNumber for invalid format', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create(
          CreateCustomerInput.make({
            name: 'Invalid Phone User',
            phone: '12345', // Too short, Indonesian phones need 9-13 digits after +62
          })
        )
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
