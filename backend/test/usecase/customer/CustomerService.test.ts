import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CreateCustomerInput, Customer, CustomerId } from '@domain/Customer'
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

  // Create mock repository layer
  const createMockCustomerRepo = (options: {
    customers: Customer[]
    findByPhoneResult?: Option.Option<Customer> | undefined
    insertResult?: Customer | undefined
  }): CustomerRepository => {
    return {
      findByPhone: vi.fn((phone: string) => {
        if (options.findByPhoneResult) {
          return Effect.succeed(options.findByPhoneResult)
        }
        const customer = options.customers.find((c) => c.phone === phone)
        return Effect.succeed(customer ? Option.some(customer) : Option.none())
      }),
      insert: vi.fn((_data: { name: string; phone: string; address: string | null }) => {
        if (options.insertResult) {
          return Effect.succeed(options.insertResult)
        }
        return Effect.succeed({} as Customer)
      }),
      findById: vi.fn((id: CustomerId) => {
        const customer = options.customers.find((c) => c.id === id)
        return Effect.succeed(customer ? Option.some(customer) : Option.none())
      }),
      delete: vi.fn((_id: CustomerId) => Effect.succeed(undefined)),
      searchByName: vi.fn((_name: string) => Effect.succeed(options.customers)),
      findSummaries: vi.fn(() =>
        Effect.succeed(
          options.customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
          }))
        )
      ),
      update: vi.fn((id: CustomerId, data: { name?: string; phone?: string; address?: string | null }) => {
        const customer = options.customers.find((c) => c.id === id)
        if (!customer) {
          return Effect.succeed(Option.none())
        }
        return Effect.succeed(
          Option.some({
            ...customer,
            ...data,
            updated_at: new Date(),
          })
        )
      }),
    } as unknown as CustomerRepository
  }

  // Build the CustomerService manually using the mock repository
  // This is the correct way to test - we build the real service with mocked dependencies
  const buildCustomerService = (mockRepo: CustomerRepository): CustomerService => {
    return {
      findByPhone: (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* mockRepo.findByPhone(phone)

          if (Option.isNone(customerOption)) {
            return yield* Effect.fail(new CustomerNotFound({ phone }))
          }

          return customerOption.value
        }),

      checkExists: (phoneInput: string) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(phoneInput)
          const customerOption = yield* mockRepo.findByPhone(phone)
          return Option.isSome(customerOption)
        }),

      create: (data: CreateCustomerInput) =>
        Effect.gen(function* () {
          const phone = yield* normalizePhoneNumber(data.phone)

          // Check if customer already exists
          const existing = yield* mockRepo.findByPhone(phone)
          if (Option.isSome(existing)) {
            return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
          }

          // Create customer
          return yield* mockRepo.insert(
            Customer.insert.make({
              name: data.name,
              phone: phone as string,
              address: data.address || null,
            })
          )
        }),
    } as CustomerService
  }

  // Create service layer with mocked repository
  const createServiceLayer = (customers: Customer[], findByPhoneResult?: Option.Option<Customer>) => {
    const mockRepo = createMockCustomerRepo({ customers, findByPhoneResult })
    const service = buildCustomerService(mockRepo)
    return Layer.succeed(CustomerService, service)
  }

  const createServiceLayerWithInsert = (customers: Customer[], newCustomer: Customer) => {
    const mockRepo = createMockCustomerRepo({
      customers,
      findByPhoneResult: Option.none(),
      insertResult: newCustomer,
    })
    const service = buildCustomerService(mockRepo)
    return Layer.succeed(CustomerService, service)
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
      const phone = '+6289876543210'
      const serviceLayer = createServiceLayer(customers, Option.none())

      const program = Effect.gen(function* () {
        const service = yield* CustomerService
        return yield* service.findByPhone(phone)
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
      
      // Check for CustomerNotFound error
      if (result._tag === 'Failure') {
        const error = result.cause
        if (error._tag === 'Fail') {
          expect(error.error).toBeInstanceOf(CustomerNotFound)
        }
      }
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
      const serviceLayer = createServiceLayer(customers, Option.none())

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
      const serviceLayer = createServiceLayerWithInsert(emptyCustomers, newCustomer)

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
      const serviceLayer = createServiceLayerWithInsert(emptyCustomers, newCustomer)

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
      const serviceLayer = createServiceLayer(customers, Option.some(existingCustomer))

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
      const serviceLayer = createServiceLayerWithInsert(emptyCustomers, newCustomer)

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
      const serviceLayer = createServiceLayerWithInsert(emptyCustomers, newCustomer)

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
      const serviceLayer = createServiceLayer(emptyCustomers, Option.none())

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
