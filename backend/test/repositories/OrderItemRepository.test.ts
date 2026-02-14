import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { OrderItemRepository, OrderItemInsertData } from '@repositories/OrderItemRepository'
import { ServiceId } from '@domain/LaundryService'
import { createMockSqlClient, createSqlError } from '../testUtils'
import { OrderId, OrderItem, OrderItemId } from '@domain/Order'

const createMockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
  ({
    id: OrderItemId.make('item-123'),
    order_id: OrderId.make('order-123'),
    service_id: 'service-123' as ServiceId,
    quantity: 5,
    price_at_order: 10000,
    subtotal: 50000,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }) as unknown as OrderItem

// Raw database row type for OrderItemWithService (before schema decoding)
interface OrderItemWithServiceRow {
  id: string
  order_id: string
  service_id: string
  service_name: string
  unit_type: string
  quantity: number
  price_at_order: number
  subtotal: number
  created_at: string
}

const createMockOrderItemWithService = (
  overrides: Partial<OrderItemWithServiceRow> = {}
): OrderItemWithServiceRow => ({
  id: 'item-123',
  order_id: 'order-123',
  service_id: 'service-123',
  service_name: 'Regular Wash',
  unit_type: 'kg',
  quantity: 5,
  price_at_order: 10000,
  subtotal: 50000,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('OrderItemRepository', () => {
  describe('findById', () => {
    it('should return Some when order item exists', async () => {
      const mockItem = createMockOrderItem({ id: 'item-123' as OrderItemId })
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [mockItem] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findById('item-123' as OrderItemId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const item = Option.getOrThrow(result)
      expect(item.id).toBe('item-123')
      expect(item.subtotal).toBe(50000)
    })

    it('should return None when order item does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findById('nonexistent' as OrderItemId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Database connection failed')
      const mockSqlLayer = createMockSqlClient<OrderItem>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findById('item-123' as OrderItemId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findByOrderId', () => {
    it('should return all items for an order', async () => {
      const items = [
        createMockOrderItem({ id: '1' as OrderItemId, order_id: 'order-123' as OrderId }),
        createMockOrderItem({ id: '2' as OrderItemId, order_id: 'order-123' as OrderId }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: items })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderId('order-123' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should return empty array when no items for order', async () => {
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderId('order-999' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<OrderItem>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderId('order-123' as OrderId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insert', () => {
    it('should create a new order item', async () => {
      const newItem = createMockOrderItem({
        id: 'new-item-id' as OrderItemId,
        order_id: 'order-456' as OrderId,
        quantity: 3,
        subtotal: 45000,
      })
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [newItem] })

      const input: OrderItemInsertData = {
        order_id: 'order-456' as OrderId,
        service_id: 'service-789' as ServiceId,
        quantity: 3,
        price_at_order: 15000,
        subtotal: 45000,
      }

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.order_id).toBe('order-456')
      expect(result.quantity).toBe(3)
      expect(result.subtotal).toBe(45000)
    })

    it('should handle SQL errors on insert', async () => {
      const sqlError = createSqlError('Insert failed')
      const mockSqlLayer = createMockSqlClient<OrderItem>({
        shouldFail: true,
        error: sqlError,
      })

      const input: OrderItemInsertData = {
        order_id: 'order-456' as OrderId,
        service_id: 'service-789' as ServiceId,
        quantity: 3,
        price_at_order: 15000,
        subtotal: 45000,
      }

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })

    it('should fail when no row returned from insert', async () => {
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [] })

      const input: OrderItemInsertData = {
        order_id: 'order-456' as OrderId,
        service_id: 'service-789' as ServiceId,
        quantity: 3,
        price_at_order: 15000,
        subtotal: 45000,
      }

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insertMany', () => {
    it('should create multiple order items', async () => {
      const items = [
        createMockOrderItem({ id: '1' as OrderItemId, quantity: 2, subtotal: 20000 }),
        createMockOrderItem({ id: '2' as OrderItemId, quantity: 1, subtotal: 25000 }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: items })

      const inputs: OrderItemInsertData[] = [
        {
          order_id: 'order-123' as OrderId,
          service_id: 'service-1' as ServiceId,
          quantity: 2,
          price_at_order: 10000,
          subtotal: 20000,
        },
        {
          order_id: 'order-123' as OrderId,
          service_id: 'service-2' as ServiceId,
          quantity: 1,
          price_at_order: 25000,
          subtotal: 25000,
        },
      ]

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insertMany(inputs)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
      expect(result[0]?.quantity).toBe(2)
      expect(result[1]?.quantity).toBe(1)
    })

    it('should return empty array when no items to insert', async () => {
      const mockSqlLayer = createMockSqlClient<OrderItem>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insertMany([])
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors on insertMany', async () => {
      const sqlError = createSqlError('Batch insert failed')
      const mockSqlLayer = createMockSqlClient<OrderItem>({
        shouldFail: true,
        error: sqlError,
      })

      const inputs: OrderItemInsertData[] = [
        {
          order_id: 'order-123' as OrderId,
          service_id: 'service-1' as ServiceId,
          quantity: 2,
          price_at_order: 10000,
          subtotal: 20000,
        },
      ]

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insertMany(inputs)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findByOrderIdWithService', () => {
    it('should return order items with service details', async () => {
      const items = [
        createMockOrderItemWithService({
          id: '1',
          order_id: 'order-123',
          service_id: 'service-1',
          service_name: 'Regular Wash',
          unit_type: 'kg',
        }),
        createMockOrderItemWithService({
          id: '2',
          order_id: 'order-123',
          service_id: 'service-2',
          service_name: 'Express Wash',
          unit_type: 'set',
          quantity: 2,
          price_at_order: 25000,
        }),
      ]
      const mockSqlLayer = createMockSqlClient<OrderItemWithServiceRow>({ rows: items })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderIdWithService('order-123' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('service_name')
      expect(result[0]).toHaveProperty('unit_type')
      expect(result[0]?.service_name).toBe('Regular Wash')
      expect(result[0]?.unit_type).toBe('kg')
    })

    it('should return empty array when no items for order', async () => {
      const mockSqlLayer = createMockSqlClient<OrderItemWithServiceRow>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderIdWithService('order-999' as OrderId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Join query failed')
      const mockSqlLayer = createMockSqlClient<OrderItemWithServiceRow>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderIdWithService('order-123' as OrderId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('deleteByOrderId', () => {
    it('should delete all items for an order', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.deleteByOrderId('order-123' as OrderId)
      })

      // Should complete without throwing
      await Effect.runPromise(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors on delete', async () => {
      const sqlError = createSqlError('Delete failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.deleteByOrderId('order-123' as OrderId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OrderItemRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })
})
