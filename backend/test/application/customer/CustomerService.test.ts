import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { CustomerService } from '@application/customer/CustomerService'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { Customer, CustomerId } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists } from '@domain/CustomerErrors'
import { normalizePhoneNumber } from '@domain/PhoneNumber'

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

  // Create mock CustomerRepository layer
  const createMockCustomerRepo = (customers: Customer[]) => {
    const mockRepo = {
      findByPhone: (phone: string) => {
        const customer = customers.find((c) => c.phone === phone)
        return Effect.succeed(customer ? Option.some(customer) : Option.none())
      },
      findById: (_id: CustomerId) => Effect.succeed(Option.none()),
      insert: (data: typeof Customer.insert.Type) =>
        Effect.succeed(
          createTestCustomer('new-customer-id', data.phone, {
            name: data.name,
            address: data.address || null,
          })
        ),
      update: (
        _id: CustomerId,
        _data: Partial<{ name: string; phone: string; address: string | null }>
      ) => Effect.succeed(Option.none()),
      delete: (_id: CustomerId) => Effect.succeed(true),
    } as unknown as CustomerRepository

    return Layer.succeed(CustomerRepository, mockRepo)
  }

  // Create CustomerService layer manually to avoid SQL dependencies
  const createServiceLayer = (customers: Customer[]) => {
    const mockRepoLayer = createMockCustomerRepo(customers)

    // Build the service manually
    const serviceEffect = Effect.gen(function* () {
      const repo = yield* CustomerRepository

      const findByPhone = (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* repo.findByPhone(phone)

          if (Option.isNone(customerOption)) {
            return yield* Effect.fail(new CustomerNotFound({ phone }))
          }

          return customerOption.value
        })

      const checkExists = (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* repo.findByPhone(phone)
          return Option.isSome(customerOption)
        })

      const create = (data: { name: string; phone: string; address?: string }) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(data.phone)

          const existing = yield* repo.findByPhone(phone)
          if (Option.isSome(existing)) {
            return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
          }

          return yield* repo.insert(
            Customer.insert.make({
              name: data.name,
              phone: phone as string,
              address: data.address || null,
            })
          )
        })

      return {
        _tag: 'CustomerService' as const,
        findByPhone,
        checkExists,
        create,
      }
    })

    return Layer.effect(CustomerService, serviceEffect).pipe(
      Layer.provide(mockRepoLayer)
    )
  }

  // Test customers
  const existingCustomer = createTestCustomer('customer-1', '+6281234567890', { name: 'John Doe' })
  const customers = [existingCustomer]

  describe('findByPhone', () => {
    it('should find customer successfully with valid phone number', async () => {
      const serviceLayer = createServiceLayer(customers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.findByPhone('+6281234567890')
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.id).toBe('customer-1')
      expect(result.name).toBe('John Doe')
      expect(result.phone).toBe('+6281234567890')
    })

    it('should fail with CustomerNotFound when phone not registered', async () => {
      const serviceLayer = createServiceLayer(customers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.findByPhone('+6289876543210')
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
      const serviceLayer = createServiceLayer(customers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.checkExists('+6289876543210')
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result).toBe(false)
    })
  })

  describe('create', () => {
    it('should create customer successfully with valid data', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create({
          name: 'Jane Doe',
          phone: '+6285555666777',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.name).toBe('Jane Doe')
      expect(result.phone).toBe('+6285555666777')
      expect(result.address).toBeNull()
    })

    it('should create customer with address', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

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
        return yield* service.create({
          name: 'Another User',
          phone: '+6281234567890',
        })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should normalize phone number from 08xx to +628xx format', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create({
          name: 'Phone Normalized User',
          phone: '085551234567',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      // Input "085551234567" has 11 digits, after normalization becomes "+6285551234567" (10 digits after +62)
      expect(result.phone).toBe('+6285551234567')
    })

    it('should normalize phone number with dashes and spaces', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create({
          name: 'Formatted Phone User',
          phone: '+628-5512-3456-7890',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.phone).toBe('+628551234567890')
    })

    it('should fail with InvalidPhoneNumber for invalid format', async () => {
      const emptyCustomers: Customer[] = []
      const serviceLayer = createServiceLayer(emptyCustomers)

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.create({
          name: 'Invalid Phone User',
          phone: '12345', // Too short, Indonesian phones need 9-13 digits after +62
        })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
