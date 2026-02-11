import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import {
  Customer,
  CustomerId,
  CustomerSummary,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@domain/Customer'

// Create a mock customer
const createMockCustomer = (overrides: Partial<Customer> = {}): Customer =>
  ({
    id: 'customer-123' as CustomerId,
    name: 'John Doe',
    phone: '+628123456789',
    address: '123 Main St',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as unknown as Customer

// Create a mock CustomerRepository
const createMockCustomerRepo = (customers: Customer[] = []) =>
  Layer.succeed(CustomerRepository, {
    findById: (id: CustomerId) =>
      Effect.succeed(Option.fromNullable(customers.find((c) => c.id === id))),
    findByPhone: (phone: string) =>
      Effect.succeed(Option.fromNullable(customers.find((c) => c.phone === phone))),
    searchByName: (name: string) =>
      Effect.succeed(customers.filter((c) => c.name.toLowerCase().includes(name.toLowerCase()))),
    insert: (data: CreateCustomerInput) =>
      Effect.succeed(
        createMockCustomer({
          name: data.name,
          phone: data.phone,
          address: data.address,
        })
      ),
    update: (id: CustomerId, data: UpdateCustomerInput) => {
      const customer = customers.find((c) => c.id === id)
      if (!customer) {
        return Effect.succeed(Option.none())
      }
      return Effect.succeed(
        Option.some(
          createMockCustomer({
            ...customer,
            name: data.name ?? customer.name,
            phone: data.phone ?? customer.phone,
            address: data.address !== undefined ? data.address : customer.address,
          })
        )
      )
    },
    delete: (_id: CustomerId) => Effect.succeed(true),
    findSummaries: () =>
      Effect.succeed(
        customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })) as CustomerSummary[]
      ),
  } as unknown as CustomerRepository)

describe('CustomerRepository', () => {
  const mockCustomer = createMockCustomer()

  describe('findById', () => {
    it('should return Some when customer exists', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findById('customer-123' as CustomerId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe('customer-123')
      }
    })

    it('should return None when customer does not exist', async () => {
      const MockRepo = createMockCustomerRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findById('nonexistent' as CustomerId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('findByPhone', () => {
    it('should return Some when customer with phone exists', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findByPhone('+628123456789')
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.phone).toBe('+628123456789')
      }
    })

    it('should return None when phone number not found', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findByPhone('+62999999999')
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('searchByName', () => {
    it('should return matching customers', async () => {
      const customers = [
        createMockCustomer({ id: '1' as CustomerId, name: 'John Doe' }),
        createMockCustomer({ id: '2' as CustomerId, name: 'Jane Doe' }),
        createMockCustomer({ id: '3' as CustomerId, name: 'Bob Smith' }),
      ]
      const MockRepo = createMockCustomerRepo(customers)

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.searchByName('doe')
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })

    it('should return empty array when no matches', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.searchByName('xyz')
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(0)
    })
  })

  describe('insert', () => {
    it('should create a new customer', async () => {
      const MockRepo = createMockCustomerRepo([])

      const input: CreateCustomerInput = {
        name: 'New Customer',
        phone: '+628111111111',
        address: '456 Oak St',
      } as CreateCustomerInput

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.name).toBe('New Customer')
      expect(result.phone).toBe('+628111111111')
    })
  })

  describe('update', () => {
    it('should update existing customer', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const updateData: UpdateCustomerInput = {
        name: 'Updated Name',
      } as UpdateCustomerInput

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.update('customer-123' as CustomerId, updateData)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.name).toBe('Updated Name')
      }
    })

    it('should return None when customer does not exist', async () => {
      const MockRepo = createMockCustomerRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.update(
          'nonexistent' as CustomerId,
          { name: 'Test' } as UpdateCustomerInput
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete customer', async () => {
      const MockRepo = createMockCustomerRepo([mockCustomer])

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.delete('customer-123' as CustomerId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result).toBe(true)
    })
  })

  describe('findSummaries', () => {
    it('should return customer summaries', async () => {
      const customers = [
        createMockCustomer({ id: '1' as CustomerId, name: 'John Doe' }),
        createMockCustomer({ id: '2' as CustomerId, name: 'Jane Doe' }),
      ]
      const MockRepo = createMockCustomerRepo(customers)

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findSummaries()
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('phone')
      expect(result[0]).not.toHaveProperty('address')
      expect(result[0]).not.toHaveProperty('created_at')
    })
  })
})
