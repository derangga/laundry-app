import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { Customer, CustomerId, CustomerSummary, UpdateCustomerInput } from '@domain/Customer'
import { createMockSqlClient } from './testUtils'
import { faker } from '@faker-js/faker'

// Create a mock customer
const createMockCustomer = (overrides: Partial<Customer> = {}): Customer =>
  ({
    id: 'customer-123' as CustomerId,
    name: 'John Doe',
    phone: '+628123456789',
    address: '123 Main St',
    created_at: new Date().toString(),
    updated_at: new Date().toString(),
    ...overrides,
  }) as unknown as Customer

describe('CustomerRepository', () => {
  const mockCustomer = createMockCustomer()

  describe('findById', () => {
    it('should return Some when customer exists', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({ rows: [mockCustomer] })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findById(CustomerId.make('customer-123'))
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe('customer-123')
      }
    })

    it('should return None when customer does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findById('nonexistent' as CustomerId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('findByPhone', () => {
    it('should return Some when customer with phone exists', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({ rows: [mockCustomer] })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findByPhone('+628123456789')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.phone).toBe('+628123456789')
      }
    })

    it('should return None when phone number not found', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [mockCustomer],
        filterFn: (arg) => arg.phone === '+62999999999',
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findByPhone('+62999999999')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )

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
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: customers,
        filterFn: (arg) => arg.name.toLowerCase().includes('doe'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.searchByName('doe')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should return empty array when no matches', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [mockCustomer],
        filterFn: (arg) => arg.name.toLowerCase().includes('xyz'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.searchByName('xyz')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(result.length).toBe(0)
    })
  })

  describe('insert', () => {
    it('should create a new customer', async () => {
      const newUser = createMockCustomer({
        name: 'New Customer',
        phone: '+628111111111',
        address: '456 Oak St',
      })
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [newUser],
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.insert(
          Customer.insert.make({
            name: 'New Customer',
            phone: '+628111111111',
            address: '456 Oak St',
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(result.name).toBe('New Customer')
      expect(result.phone).toBe('+628111111111')
    })
  })

  describe('update', () => {
    it('should update existing customer', async () => {
      const updatedCust = createMockCustomer({ id: '1' as CustomerId, name: 'Updated Name' })
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [updatedCust],
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.update(
          CustomerId.make('customer-123'),
          UpdateCustomerInput.make({ name: 'Updated Name' })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.name).toBe('Updated Name')
      }
    })

    it('should return None when customer does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [],
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.update(
          CustomerId.make('nonexistent'),
          UpdateCustomerInput.make({ name: 'Test' })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete customer', async () => {
      const mockSqlLayer = createMockSqlClient<Customer>({
        rows: [],
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.delete('customer-123' as CustomerId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBeUndefined()
    })
  })

  describe('findSummaries', () => {
    it('should return customer summaries', async () => {
      const customers = [
        CustomerSummary.make({
          id: '1' as CustomerId,
          name: faker.person.fullName(),
          phone: faker.phone.number(),
        }),
        CustomerSummary.make({
          id: '2' as CustomerId,
          name: faker.person.fullName(),
          phone: faker.phone.number(),
        }),
      ]
      const mockSqlLayer = createMockSqlClient<CustomerSummary>({
        rows: customers,
      })

      const program = Effect.gen(function* () {
        const repo = yield* CustomerRepository
        return yield* repo.findSummaries()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CustomerRepository.Default), Effect.provide(mockSqlLayer))
      )

      console.log(result)
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('phone')
      expect(result[0]).not.toHaveProperty('address')
      expect(result[0]).not.toHaveProperty('created_at')
    })
  })
})
