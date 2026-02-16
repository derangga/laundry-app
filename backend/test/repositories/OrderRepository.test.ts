import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderWithDetails,
  OrderSummary,
  OrderId,
  OrderFilterOptions,
} from '@domain/Order'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'
import { createMockSqlClient, createSqlError } from '../testUtils'

const createMockOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: OrderId.make('order-123'),
    order_number: 'ORD-001',
    customer_id: CustomerId.make('customer-123'),
    status: 'received',
    payment_status: 'unpaid',
    total_price: 50000,
    created_by: UserId.make('user-123'),
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }) as unknown as Order

const createMockOrderWithDetails = (overrides: Partial<OrderWithDetails> = {}): OrderWithDetails =>
  ({
    id: '1' as OrderId,
    order_number: 'ORD-001',
    customer_id: 'customer-123' as CustomerId,
    customer_name: 'John Doe',
    customer_phone: '+628123456789',
    status: 'received' as OrderStatus,
    payment_status: 'unpaid' as PaymentStatus,
    total_price: 50000,
    created_by: 'user-123' as UserId,
    created_by_name: 'Admin User',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }) as unknown as OrderWithDetails

const createMockOrderSummary = (overrides: Partial<OrderSummary> = {}): OrderSummary =>
  ({
    id: '1' as OrderId,
    order_number: 'ORD-001',
    total_price: 50000,
    payment_status: 'paid' as PaymentStatus,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }) as unknown as OrderSummary

describe('OrderRepository', () => {
  describe('findById', () => {
    it('should return Some when order exists', async () => {
      const mockOrder = createMockOrder({ id: 'order-123' as OrderId })
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [mockOrder] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findById('order-123' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const order = Option.getOrThrow(result)
      expect(order.id).toBe('order-123')
      expect(order.order_number).toBe('ORD-001')
    })

    it('should return None when order does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findById('nonexistent' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Database connection failed')
      const mockSqlLayer = createMockSqlClient<Order>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findById('order-123' as OrderId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findByOrderNumber', () => {
    it('should return Some when order number exists', async () => {
      const mockOrder = createMockOrder({ order_number: 'ORD-001' })
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [mockOrder] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByOrderNumber('ORD-001')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const order = Option.getOrThrow(result)
      expect(order.order_number).toBe('ORD-001')
    })

    it('should return None when order number not found', async () => {
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByOrderNumber('ORD-999')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<Order>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByOrderNumber('ORD-001')
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findByCustomerId', () => {
    it('should return orders for customer', async () => {
      const orders = [
        createMockOrder({ id: '1' as OrderId, customer_id: 'customer-123' as CustomerId }),
        createMockOrder({ id: '2' as OrderId, customer_id: 'customer-123' as CustomerId }),
      ]
      const mockSqlLayer = createMockSqlClient<Order>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByCustomerId('customer-123' as CustomerId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should return empty array when no orders for customer', async () => {
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByCustomerId('customer-999' as CustomerId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<Order>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByCustomerId('customer-123' as CustomerId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findWithFilters', () => {
    it('should filter by status', async () => {
      const orders = [
        createMockOrder({ id: '1' as OrderId, status: 'received' as OrderStatus }),
        createMockOrder({ id: '2' as OrderId, status: 'in_progress' as OrderStatus }),
      ]
      const mockSqlLayer = createMockSqlClient<Order>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.some('received'),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should filter by payment status', async () => {
      const orders = [
        createMockOrder({ id: '1' as OrderId, payment_status: 'paid' as PaymentStatus }),
        createMockOrder({ id: '2' as OrderId, payment_status: 'unpaid' as PaymentStatus }),
      ]
      const mockSqlLayer = createMockSqlClient<Order>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.none(),
            payment_status: Option.some('paid'),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should apply limit', async () => {
      const orders = [
        createMockOrder({ id: '1' as OrderId }),
        createMockOrder({ id: '2' as OrderId }),
        createMockOrder({ id: '3' as OrderId }),
      ]
      const mockSqlLayer = createMockSqlClient<Order>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.none(),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.some(2),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(3)
    })

    it('should handle empty filters', async () => {
      const orders = [
        createMockOrder({ id: '1' as OrderId }),
        createMockOrder({ id: '2' as OrderId }),
      ]
      const mockSqlLayer = createMockSqlClient<Order>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<Order>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.some('received'),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insert', () => {
    it('should create a new order', async () => {
      const newOrder = createMockOrder({
        id: 'new-order-id' as OrderId,
        order_number: 'ORD-002',
        total_price: 75000,
      })
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [newOrder] })

      const input = Order.insert.make({
        order_number: 'ORD-002',
        customer_id: CustomerId.make('customer-456'),
        status: 'received',
        payment_status: 'unpaid',
        total_price: 75000,
        created_by: UserId.make('user-123'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.order_number).toBe('ORD-002')
      expect(result.total_price).toBe(75000)
    })

    it('should handle SQL errors on insert', async () => {
      const sqlError = createSqlError('Duplicate order number')
      const mockSqlLayer = createMockSqlClient<Order>({
        shouldFail: true,
        error: sqlError,
      })

      const input = Order.insert.make({
        order_number: 'ORD-002',
        customer_id: CustomerId.make('customer-456'),
        status: 'received',
        payment_status: 'unpaid',
        total_price: 75000,
        created_by: UserId.make('user-123'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })

    it('should fail when no row returned from insert', async () => {
      const mockSqlLayer = createMockSqlClient<Order>({ rows: [] })

      const input = Order.insert.make({
        order_number: 'ORD-002',
        customer_id: CustomerId.make('customer-456'),
        status: 'received',
        payment_status: 'unpaid',
        total_price: 75000,
        created_by: UserId.make('user-123'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateStatus('order-123' as OrderId, 'in_progress' as OrderStatus)
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateStatus('order-123' as OrderId, 'in_progress' as OrderStatus)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updatePaymentStatus('order-123' as OrderId, 'paid' as PaymentStatus)
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updatePaymentStatus('order-123' as OrderId, 'paid' as PaymentStatus)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('updateTotalPrice', () => {
    it('should update total price', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateTotalPrice('order-123' as OrderId, 100000)
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateTotalPrice('order-123' as OrderId, 100000)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findWithDetails', () => {
    it('should return orders with customer and user details', async () => {
      const orders = [
        createMockOrderWithDetails({
          id: '1' as OrderId,
          customer_name: 'John Doe',
        }),
        createMockOrderWithDetails({
          id: '2' as OrderId,
          order_number: 'ORD-002',
          customer_id: 'customer-456' as CustomerId,
          customer_name: 'Jane Smith',
          customer_phone: '+628987654321',
          status: 'in_progress' as OrderStatus,
          payment_status: 'paid' as PaymentStatus,
          total_price: 75000,
        }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderWithDetails>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithDetails()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('customer_name')
      expect(result[0]).toHaveProperty('customer_phone')
      expect(result[0]).toHaveProperty('created_by_name')
      expect(result[0]?.customer_name).toBe('John Doe')
    })

    it('should apply filters', async () => {
      const orders = [
        createMockOrderWithDetails({
          id: '1' as OrderId,
          status: 'received' as OrderStatus,
        }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderWithDetails>({ rows: orders })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithDetails(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.some('received'),
            payment_status: Option.none(),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(1)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Join query failed')
      const mockSqlLayer = createMockSqlClient<OrderWithDetails>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithDetails()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findSummaries', () => {
    it('should return order summaries for analytics', async () => {
      const summaries = [
        createMockOrderSummary({
          id: '1' as OrderId,
          order_number: 'ORD-001',
          total_price: 50000,
          payment_status: 'paid' as PaymentStatus,
        }),
        createMockOrderSummary({
          id: '2' as OrderId,
          order_number: 'ORD-002',
          total_price: 75000,
          payment_status: 'paid' as PaymentStatus,
        }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderSummary>({ rows: summaries })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findSummaries(
          new OrderFilterOptions({
            customer_id: Option.none(),
            status: Option.none(),
            payment_status: Option.some('paid'),
            start_date: Option.none(),
            end_date: Option.none(),
            limit: Option.none(),
            offset: Option.none(),
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('order_number')
      expect(result[0]).toHaveProperty('total_price')
      expect(result[0]).toHaveProperty('payment_status')
      expect(result[0]).toHaveProperty('created_at')
      expect(result[0]).not.toHaveProperty('customer_id')
      expect(result[0]).not.toHaveProperty('status')
    })

    it('should return all summaries when no filters', async () => {
      const summaries = [
        createMockOrderSummary({
          id: '1' as OrderId,
        }),
        createMockOrderSummary({
          id: '2' as OrderId,
          order_number: 'ORD-002',
          total_price: 75000,
          payment_status: 'unpaid' as PaymentStatus,
        }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderSummary>({ rows: summaries })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findSummaries()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<OrderSummary>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findSummaries()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })
})
