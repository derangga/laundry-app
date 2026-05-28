import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { createMockSqlClient, createSqlError } from '../testUtils'

describe('AnalyticsRepository', () => {
  describe('getWeeklyAggregation', () => {
    it('parses cancelled_count alongside revenue and order_count', async () => {
      const mockSqlLayer = createMockSqlClient<{
        week_start: Date
        total_revenue: string
        order_count: string
        cancelled_count: string
      }>({
        rows: [
          {
            week_start: new Date('2024-01-01T00:00:00.000Z'),
            total_revenue: '5000',
            order_count: '10',
            cancelled_count: '2',
          },
        ],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getWeeklyAggregation(
          new Date('2024-01-01'),
          new Date('2024-01-15'),
          Option.none()
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.total_revenue).toBe(5000)
      expect(result[0]?.order_count).toBe(10)
      expect(result[0]?.cancelled_count).toBe(2)
    })

    it('parses zero cancelled_count', async () => {
      const mockSqlLayer = createMockSqlClient<{
        week_start: Date
        total_revenue: string
        order_count: string
        cancelled_count: string
      }>({
        rows: [
          {
            week_start: new Date('2024-01-08T00:00:00.000Z'),
            total_revenue: '0',
            order_count: '0',
            cancelled_count: '0',
          },
        ],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getWeeklyAggregation(
          new Date('2024-01-08'),
          new Date('2024-01-15'),
          Option.some('paid')
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result[0]?.cancelled_count).toBe(0)
    })

    it('handles SQL errors', async () => {
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: createSqlError('weekly aggregation failed'),
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getWeeklyAggregation(
          new Date('2024-01-01'),
          new Date('2024-01-15'),
          Option.none()
        )
      })

      const exit = await Effect.runPromiseExit(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(exit._tag).toBe('Failure')
    })
  })

  describe('getCancelledOrdersThisWeek', () => {
    it('returns the cancelled count for the current week', async () => {
      const mockSqlLayer = createMockSqlClient<{ count: string }>({
        rows: [{ count: '7' }],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getCancelledOrdersThisWeek()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(7)
    })

    it('returns 0 when no rows match', async () => {
      const mockSqlLayer = createMockSqlClient<{ count: string }>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getCancelledOrdersThisWeek()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(0)
    })
  })

  describe('getTodaysOrderCount', () => {
    it('returns parsed integer from row', async () => {
      const mockSqlLayer = createMockSqlClient<{ count: string }>({
        rows: [{ count: '11' }],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getTodaysOrderCount()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(11)
    })
  })

  describe('getPendingPaymentCount', () => {
    it('returns parsed integer from row', async () => {
      const mockSqlLayer = createMockSqlClient<{ count: string }>({
        rows: [{ count: '4' }],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getPendingPaymentCount()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(4)
    })
  })

  describe('getWeeklyRevenue', () => {
    it('returns parsed float from row', async () => {
      const mockSqlLayer = createMockSqlClient<{ total: string }>({
        rows: [{ total: '12345.67' }],
      })

      const program = Effect.gen(function* () {
        const repo = yield* AnalyticsRepository
        return yield* repo.getWeeklyRevenue()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(AnalyticsRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(12345.67)
    })
  })
})
